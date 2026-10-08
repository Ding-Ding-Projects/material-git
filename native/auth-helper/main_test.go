package main

import (
	"bytes"
	"encoding/json"
	"errors"
	keyring "github.com/zalando/go-keyring"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type fakeVault struct {
	items       map[string]string
	sets        int
	failAt      int
	unavailable bool
}

func (v *fakeVault) Get(s, u string) (string, error) {
	if v.unavailable {
		return "", errors.New("synthetic unavailable vault")
	}
	if value, ok := v.items[s+"/"+u]; ok {
		return value, nil
	}
	return "", keyring.ErrNotFound
}
func (v *fakeVault) Set(s, u, p string) error {
	v.sets++
	if v.sets == v.failAt {
		return errors.New("synthetic write refusal")
	}
	v.items[s+"/"+u] = p
	return nil
}
func (v *fakeVault) Delete(s, u string) error { delete(v.items, s+"/"+u); return nil }
func fixture(t *testing.T) (string, *fakeVault, request, []byte) {
	t.Helper()
	directory := t.TempDir()
	original := []byte("github.com:\n  user: old-user\n  oauth_token: previous-legacy-token\n  git_protocol: https\n  users:\n    old-user: {}\n    octocat:\n      oauth_token: previous-user-token\nforge.example:\n  user: enterprise\n  unknown_setting: preserved\n")
	if e := os.WriteFile(filepath.Join(directory, "hosts.yml"), original, 0600); e != nil {
		t.Fatal(e)
	}
	_, _, fingerprint, e := configSnapshot(directory)
	if e != nil {
		t.Fatal(e)
	}
	return directory, &fakeVault{items: map[string]string{"gh:github.com/octocat": "old-named-secret", "gh:github.com/": "old-active-secret"}}, request{Action: "register", Hostname: "github.com", Login: "octocat", Protocol: "ssh", Token: "synthetic-import-token", Fingerprint: fingerprint}, original
}
func TestSecureCommitUsesExactCLISchema(t *testing.T) {
	d, v, r, _ := fixture(t)
	transaction, e := begin(v, d, r)
	if e != nil {
		t.Fatal(e)
	}
	contents, _ := os.ReadFile(filepath.Join(d, "hosts.yml"))
	if bytes.Contains(contents, []byte(r.Token)) || bytes.Contains(contents, []byte("previous-user-token")) || bytes.Contains(contents, []byte("previous-legacy-token")) {
		t.Fatal("credential leaked to metadata")
	}
	for _, value := range []string{"user: octocat", "git_protocol: ssh", "unknown_setting: preserved", "forge.example"} {
		if !bytes.Contains(contents, []byte(value)) {
			t.Fatal("metadata missing", value)
		}
	}
	if v.items["gh:github.com/octocat"] != r.Token || v.items["gh:github.com/"] != r.Token {
		t.Fatal("wrong keyring slots")
	}
	if e = transaction.commit(); e != nil {
		t.Fatal(e)
	}
	if e = transaction.rollback(); e != nil {
		t.Fatal(e)
	}
	info, _ := os.Stat(filepath.Join(d, "hosts.yml"))
	if info.Mode().Perm() != 0600 {
		t.Fatal("unprotected metadata")
	}
}
func TestWriteFailureRestoresPreviousSlotsWithoutPlaintextFallback(t *testing.T) {
	d, v, r, original := fixture(t)
	v.failAt = 2
	if _, e := begin(v, d, r); e == nil {
		t.Fatal("write failure accepted")
	}
	if v.items["gh:github.com/octocat"] != "old-named-secret" || v.items["gh:github.com/"] != "old-active-secret" {
		t.Fatal("previous slots lost")
	}
	contents, _ := os.ReadFile(filepath.Join(d, "hosts.yml"))
	if !bytes.Equal(contents, original) {
		t.Fatal("metadata changed on failed vault write")
	}
}
func TestPostVerificationRollbackRestoresMetadataExactly(t *testing.T) {
	d, v, r, original := fixture(t)
	tr, e := begin(v, d, r)
	if e != nil {
		t.Fatal(e)
	}
	if e = tr.rollback(); e != nil {
		t.Fatal(e)
	}
	contents, _ := os.ReadFile(filepath.Join(d, "hosts.yml"))
	if !bytes.Equal(contents, original) || v.items["gh:github.com/"] != "old-active-secret" {
		t.Fatal("rollback failed")
	}
}
func TestConcurrentExternalChangesAreNotOverwrittenDuringRollback(t *testing.T) {
	d, v, r, _ := fixture(t)
	tr, e := begin(v, d, r)
	if e != nil {
		t.Fatal(e)
	}
	external := []byte("forge.example: {}\n")
	os.WriteFile(filepath.Join(d, "hosts.yml"), external, 0600)
	v.items["gh:github.com/"] = "external-active-secret"
	if tr.rollback() == nil {
		t.Fatal("concurrent state claimed restored")
	}
	contents, _ := os.ReadFile(filepath.Join(d, "hosts.yml"))
	if !bytes.Equal(contents, external) || v.items["gh:github.com/"] != "external-active-secret" {
		t.Fatal("external state overwritten")
	}
}
func TestProtocolEOFRequestsRollbackWithoutSecretOutput(t *testing.T) {
	d, v, r, original := fixture(t)
	request, _ := json.Marshal(r)
	var output bytes.Buffer
	if run(bytes.NewReader(append(request, '\n')), &output, v, d, "windows") != 0 {
		t.Fatal(output.String())
	}
	if !strings.Contains(output.String(), `"ready":true`) || strings.Contains(output.String(), r.Token) || strings.Contains(output.String(), "old-active-secret") {
		t.Fatal("unsafe protocol output")
	}
	contents, _ := os.ReadFile(filepath.Join(d, "hosts.yml"))
	if !bytes.Equal(contents, original) {
		t.Fatal("EOF did not restore")
	}
}
func TestVaultUnavailableAndUnsupportedPlatformNeverWrite(t *testing.T) {
	for _, platform := range []string{"linux", "darwin"} {
		d, v, _, original := fixture(t)
		v.unavailable = true
		var output bytes.Buffer
		if run(strings.NewReader("{\"action\":\"probe\"}\n"), &output, v, d, platform) == 0 {
			t.Fatal("unavailable vault accepted")
		}
		if v.sets != 0 {
			t.Fatal("probe wrote credential")
		}
		contents, _ := os.ReadFile(filepath.Join(d, "hosts.yml"))
		if !bytes.Equal(contents, original) {
			t.Fatal("probe changed metadata")
		}
	}
}
func TestMalformedAndStaleRequestsRefuseBeforeVaultWrites(t *testing.T) {
	d, v, r, _ := fixture(t)
	for _, change := range []func(*request){func(r *request) { r.Fingerprint = "stale" }, func(r *request) { r.Hostname = "https://github.com" }, func(r *request) { r.Token = "bad\nvalue" }, func(r *request) { r.Protocol = "git" }} {
		candidate := r
		change(&candidate)
		if _, e := begin(v, d, candidate); e == nil {
			t.Fatal("invalid registration accepted")
		}
	}
	if v.sets != 0 {
		t.Fatal("invalid registration wrote")
	}
	for _, data := range []string{"github.com: &x {}\nforge.example: *x\n", "github.com: {}\ngithub.com: {}\n", "{}\n---\n{}\n"} {
		if _, e := metadata([]byte(data), r); e == nil {
			t.Fatal("unsafe metadata accepted")
		}
	}
}

func TestExternalSecureSlotChangePreventsCommit(t *testing.T) {
	d, v, r, _ := fixture(t)
	transaction, e := begin(v, d, r)
	if e != nil {
		t.Fatal(e)
	}
	v.items["gh:github.com/octocat"] = "external-named-secret"
	if transaction.commit() == nil {
		t.Fatal("changed secure account committed")
	}
	if transaction.rollback() == nil {
		t.Fatal("changed secure account claimed restored")
	}
	if v.items["gh:github.com/octocat"] != "external-named-secret" {
		t.Fatal("external secret overwritten")
	}
}
