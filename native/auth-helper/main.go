// Secure-only registration uses the pinned GitHub CLI keyring namespace and
// metadata schema. It never calls the CLI login fallback or writes a token file.
package main

import (
	"bufio"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"regexp"
	"runtime"
	"syscall"
	"time"

	ghconfig "github.com/cli/go-gh/v2/pkg/config"
	keyring "github.com/zalando/go-keyring"
	"gopkg.in/yaml.v3"
)

const maxMetadata = 1024 * 1024

var hostnamePattern = regexp.MustCompile(`^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$`)
var loginPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9-]{0,38}(?:\[bot\])?$`)

type request struct {
	Action      string `json:"action"`
	Hostname    string `json:"hostname"`
	Login       string `json:"login"`
	Protocol    string `json:"gitProtocol"`
	Token       string `json:"token"`
	Fingerprint string `json:"fingerprint"`
}
type response struct {
	Available   bool   `json:"available,omitempty"`
	Fingerprint string `json:"fingerprint,omitempty"`
	Ready       bool   `json:"ready,omitempty"`
	OK          bool   `json:"ok,omitempty"`
	Error       string `json:"error,omitempty"`
	Uncertain   bool   `json:"uncertain,omitempty"`
	Committed   bool   `json:"committed,omitempty"`
	RolledBack  bool   `json:"rolledBack,omitempty"`
}
type vault interface {
	Get(string, string) (string, error)
	Set(string, string, string) error
	Delete(string, string) error
}
type osVault struct{}

func (osVault) Get(s, u string) (string, error) { return keyring.Get(s, u) }
func (osVault) Set(s, u, t string) error        { return keyring.Set(s, u, t) }
func (osVault) Delete(s, u string) error        { return keyring.Delete(s, u) }

type savedSecret struct {
	user, value string
	exists      bool
}
type transaction struct {
	vault               vault
	service, path       string
	old                 []savedSecret
	token               string
	original, installed []byte
	existed             bool
	finished            bool
}

func digest(data []byte, exists bool) string {
	h := sha256.New()
	if exists {
		h.Write([]byte{1})
	} else {
		h.Write([]byte{0})
	}
	h.Write(data)
	return hex.EncodeToString(h.Sum(nil))
}
func configSnapshot(directory string) ([]byte, bool, string, error) {
	canonical, e := filepath.EvalSymlinks(directory)
	if e != nil || canonical != filepath.Clean(directory) {
		return nil, false, "", errors.New("configuration directory is unavailable or linked")
	}
	path := filepath.Join(directory, "hosts.yml")
	info, e := os.Lstat(path)
	if os.IsNotExist(e) {
		return nil, false, digest(nil, false), nil
	}
	if e != nil || !info.Mode().IsRegular() || info.Size() > maxMetadata {
		return nil, false, "", errors.New("configuration metadata is unavailable")
	}
	file, e := os.Open(path)
	if e != nil {
		return nil, false, "", errors.New("configuration metadata is unavailable")
	}
	defer file.Close()
	opened, e := file.Stat()
	if e != nil || !os.SameFile(info, opened) {
		return nil, false, "", errors.New("configuration metadata changed")
	}
	data, e := io.ReadAll(io.LimitReader(file, maxMetadata+1))
	if e != nil || len(data) > maxMetadata {
		return nil, false, "", errors.New("configuration metadata exceeds its limit")
	}
	after, e := os.Lstat(path)
	if e != nil || !os.SameFile(info, after) || info.Size() != after.Size() || !info.ModTime().Equal(after.ModTime()) {
		return nil, false, "", errors.New("configuration metadata changed")
	}
	return data, true, digest(data, true), nil
}
func nodeMap(n *yaml.Node, key string) *yaml.Node {
	for i := 0; i+1 < len(n.Content); i += 2 {
		if n.Content[i].Value == key {
			return n.Content[i+1]
		}
	}
	value := &yaml.Node{Kind: yaml.MappingNode, Tag: "!!map"}
	n.Content = append(n.Content, &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: key}, value)
	return value
}
func setNode(n *yaml.Node, key, value string) {
	for i := 0; i+1 < len(n.Content); i += 2 {
		if n.Content[i].Value == key {
			n.Content[i+1] = &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: value}
			return
		}
	}
	n.Content = append(n.Content, &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: key}, &yaml.Node{Kind: yaml.ScalarNode, Tag: "!!str", Value: value})
}
func removeNode(n *yaml.Node, key string) {
	for i := 0; i+1 < len(n.Content); i += 2 {
		if n.Content[i].Value == key {
			n.Content = append(n.Content[:i], n.Content[i+2:]...)
			return
		}
	}
}
func metadata(data []byte, r request) ([]byte, error) {
	var doc yaml.Node
	if len(bytes.TrimSpace(data)) == 0 {
		data = []byte("{}\n")
	}
	decoder := yaml.NewDecoder(bytes.NewReader(data))
	if e := decoder.Decode(&doc); e != nil || len(doc.Content) != 1 || doc.Content[0].Kind != yaml.MappingNode {
		return nil, errors.New("configuration metadata is malformed")
	}
	var extra yaml.Node
	if decoder.Decode(&extra) != io.EOF {
		return nil, errors.New("configuration metadata contains multiple documents")
	}
	if e := validateNode(doc.Content[0], 0); e != nil {
		return nil, e
	}
	host := nodeMap(doc.Content[0], r.Hostname)
	if host.Kind != yaml.MappingNode {
		return nil, errors.New("host metadata is malformed")
	}
	users := nodeMap(host, "users")
	if users.Kind != yaml.MappingNode {
		return nil, errors.New("account metadata is malformed")
	}
	user := nodeMap(users, r.Login)
	if user.Kind == yaml.ScalarNode && user.Value == "" {
		user.Kind = yaml.MappingNode
		user.Tag = "!!map"
	}
	if user.Kind != yaml.MappingNode {
		return nil, errors.New("account metadata is malformed")
	}
	removeNode(user, "oauth_token")
	removeNode(host, "oauth_token")
	setNode(host, "git_protocol", r.Protocol)
	setNode(host, "user", r.Login)
	out, e := yaml.Marshal(&doc)
	if e != nil || len(out) > maxMetadata {
		return nil, errors.New("configuration metadata could not be prepared")
	}
	return out, nil
}
func validateNode(n *yaml.Node, depth int) error {
	if depth > 20 || n.Kind == yaml.AliasNode {
		return errors.New("configuration metadata aliases or nesting are unsupported")
	}
	if n.Kind == yaml.MappingNode {
		seen := map[string]bool{}
		for i := 0; i+1 < len(n.Content); i += 2 {
			key := n.Content[i]
			if key.Kind != yaml.ScalarNode || key.Tag != "!!str" || seen[key.Value] {
				return errors.New("configuration metadata keys are malformed")
			}
			seen[key.Value] = true
		}
	}
	for _, child := range n.Content {
		if e := validateNode(child, depth+1); e != nil {
			return e
		}
	}
	return nil
}
func atomicWrite(path string, data []byte) error {
	file, e := os.CreateTemp(filepath.Dir(path), ".material-auth-")
	if e != nil {
		return e
	}
	temporary := file.Name()
	defer os.Remove(temporary)
	if e = file.Chmod(0600); e == nil {
		_, e = file.Write(data)
	}
	if e == nil {
		e = file.Sync()
	}
	closeError := file.Close()
	if e == nil {
		e = closeError
	}
	if e == nil {
		e = os.Rename(temporary, path)
	}
	return e
}
func begin(v vault, directory string, r request) (*transaction, error) {
	if len(r.Hostname) > 253 || !hostnamePattern.MatchString(r.Hostname) || !loginPattern.MatchString(r.Login) || (r.Protocol != "https" && r.Protocol != "ssh") || len(r.Token) < 1 || len(r.Token) > 16384 || regexp.MustCompile(`[\s\x00-\x1f]`).MatchString(r.Token) {
		return nil, errors.New("invalid secure registration")
	}
	original, exists, fingerprint, e := configSnapshot(directory)
	if e != nil || fingerprint != r.Fingerprint {
		return nil, errors.New("configuration metadata changed before registration")
	}
	installed, e := metadata(original, r)
	if e != nil {
		return nil, e
	}
	t := &transaction{vault: v, service: "gh:" + r.Hostname, path: filepath.Join(directory, "hosts.yml"), original: original, installed: installed, existed: exists, token: r.Token}
	for _, user := range []string{r.Login, ""} {
		value, e := v.Get(t.service, user)
		if e != nil && !errors.Is(e, keyring.ErrNotFound) {
			return nil, errors.New("secure vault is unavailable")
		}
		t.old = append(t.old, savedSecret{user, value, e == nil})
	}
	fail := func() (*transaction, error) {
		if t.rollback() != nil {
			return nil, errors.New("secure registration failed; rollback could not be verified")
		}
		return nil, errors.New("secure registration failed and was rolled back")
	}
	for _, user := range []string{r.Login, ""} {
		if v.Set(t.service, user, r.Token) != nil {
			return fail()
		}
		value, e := v.Get(t.service, user)
		if e != nil || value != r.Token {
			return fail()
		}
	}
	current, nowExists, nowFingerprint, e := configSnapshot(directory)
	_ = current
	if e != nil || nowExists != exists || nowFingerprint != fingerprint {
		return fail()
	}
	if atomicWrite(t.path, installed) != nil {
		return fail()
	}
	r.Token = ""
	return t, nil
}
func (t *transaction) rollback() error {
	if t.finished {
		return nil
	}
	var failed bool
	for _, old := range t.old {
		current, e := t.vault.Get(t.service, old.user)
		if errors.Is(e, keyring.ErrNotFound) && !old.exists {
			continue
		}
		if e != nil {
			failed = true
			continue
		}
		if old.exists && current == old.value {
			continue
		}
		if current != t.token {
			failed = true
			continue
		}
		if old.exists {
			if t.vault.Set(t.service, old.user, old.value) != nil {
				failed = true
			}
		} else if e := t.vault.Delete(t.service, old.user); e != nil && !errors.Is(e, keyring.ErrNotFound) {
			failed = true
		}
	}
	current, exists, _, e := configSnapshot(filepath.Dir(t.path))
	if e != nil {
		failed = true
	} else if bytes.Equal(current, t.installed) {
		if t.existed {
			if atomicWrite(t.path, t.original) != nil {
				failed = true
			}
		} else if exists && os.Remove(t.path) != nil {
			failed = true
		}
	} else if exists != t.existed || !bytes.Equal(current, t.original) {
		failed = true
	}
	t.finished = true
	t.token = ""
	for i := range t.old {
		t.old[i].value = ""
	}
	if failed {
		return errors.New("rollback could not be verified")
	}
	return nil
}
func (t *transaction) commit() error {
	current, exists, _, e := configSnapshot(filepath.Dir(t.path))
	if e != nil || !exists || !bytes.Equal(current, t.installed) {
		return errors.New("configuration metadata changed during verification")
	}
	for _, old := range t.old {
		value, e := t.vault.Get(t.service, old.user)
		if e != nil || value != t.token {
			return errors.New("secure credential changed during verification")
		}
	}
	t.finished = true
	t.token = ""
	for i := range t.old {
		t.old[i].value = ""
	}
	return nil
}
func emit(w io.Writer, r response) { _ = json.NewEncoder(w).Encode(r) }
func run(input io.Reader, output io.Writer, v vault, directory, osName string) int {
	scanner := bufio.NewScanner(input)
	scanner.Buffer(make([]byte, 4096), 32768)
	if !scanner.Scan() {
		emit(output, response{Error: "invalid secure-helper request"})
		return 1
	}
	var r request
	decoder := json.NewDecoder(bytes.NewReader(scanner.Bytes()))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&r) != nil || decoder.Decode(new(any)) != io.EOF {
		emit(output, response{Error: "invalid secure-helper request"})
		return 1
	}
	if osName != "linux" && osName != "windows" {
		emit(output, response{Error: "secure registration is unavailable on this platform"})
		return 1
	}
	if r.Action == "probe" {
		if r.Hostname != "" || r.Token != "" || r.Login != "" || r.Protocol != "" || r.Fingerprint != "" {
			emit(output, response{Error: "invalid capability request"})
			return 1
		}
		_, e := v.Get("material-git:secure-vault-probe", "unregistered")
		if e != nil && !errors.Is(e, keyring.ErrNotFound) {
			emit(output, response{Error: "OS secure vault is unavailable"})
			return 1
		}
		_, _, fingerprint, e := configSnapshot(directory)
		if e != nil {
			emit(output, response{Error: "configuration metadata is unavailable"})
			return 1
		}
		emit(output, response{Available: true, Fingerprint: fingerprint})
		return 0
	}
	if r.Action != "register" {
		emit(output, response{Error: "unsupported secure-helper action"})
		return 1
	}
	t, e := begin(v, directory, r)
	r.Token = ""
	if e != nil {
		emit(output, response{Error: e.Error(), Uncertain: e.Error() == "secure registration failed; rollback could not be verified"})
		return 1
	}
	defer t.rollback()
	emit(output, response{Ready: true})
	decision := make(chan string, 1)
	go func() {
		if scanner.Scan() {
			decision <- scanner.Text()
		} else {
			decision <- "rollback"
		}
	}()
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(signals)
	select {
	case line := <-decision:
		if line == "commit" {
			if t.commit() == nil {
				emit(output, response{OK: true, Committed: true})
				return 0
			}
		}
	case <-signals:
	case <-time.After(30 * time.Second):
	}
	if t.rollback() != nil {
		emit(output, response{Error: "secure registration rollback could not be verified", Uncertain: true})
		return 1
	}
	emit(output, response{OK: true, RolledBack: true})
	return 0
}
func main() {
	directory := ghconfig.ConfigDir()
	if e := os.MkdirAll(directory, 0700); e != nil {
		emit(os.Stdout, response{Error: "configuration directory is unavailable"})
		os.Exit(1)
	}
	os.Exit(run(os.Stdin, os.Stdout, osVault{}, directory, runtime.GOOS))
}
