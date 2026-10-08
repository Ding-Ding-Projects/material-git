# Git action and safety audit

Checked 8 October 2026 using read-only official sources and isolated version/help queries. This is an implementation backlog and architecture review. It does **not** certify complete Git support or verified Windows behavior.

The [machine-readable matrix](git-action-map.json) records every command in the official command classification list plus every registration in `git.c`, with proposed natural task destinations, documented option references, configuration schemas, environment names, risks, and evidence states. Entries explicitly await action-specific native and GUI verification. A repository command registry is not a functional graphical interface.

## Versions and provenance

| Component | Inspected or pinned | Latest official source | Consequence |
| --- | --- | --- | --- |
| Linux development Git | 2.52.0 | Git 2.56.0 | Runtime capability checks are necessary; Linux tests cannot prove newer Windows options. |
| Windows package | MinGit 2.56.0.2, reports `git version 2.56.0.windows.2` | Git for Windows 2.56.0.windows.2, published 5 October 2026 | Pin is current; actual packaged execution still needs Windows evidence. |
| Optional Git LFS | Linux reports 3.6.1 | 3.8.0, published 28 August 2026 | LFS is a separate executable and service. Its presence in a development machine does not establish bundling or GUI support. |

Official Git commit: [`a018953688f1b10bddf91bff8747068f5f4746a4`](https://github.com/git/git/tree/a018953688f1b10bddf91bff8747068f5f4746a4). Git for Windows commit: [`cc4dbf752a05efdc0e04e71fd3e8110d11bdd35c`](https://github.com/git-for-windows/git/tree/cc4dbf752a05efdc0e04e71fd3e8110d11bdd35c). Sources include `command-list.txt`, the builtin dispatch table, 945 Git AsciiDoc files, the 2.52.0 equivalents, and [Git LFS 3.8.0 references](https://github.com/git-lfs/git-lfs/tree/v3.8.0/docs/man). The packaged archive digest is specified in `scripts/fetch-git.mjs` and must be verified during fetching.

The matrix currently contains 173 builtin and distributed command names, including 149 builtin registrations; 4,826 per-command documented option mentions; 763 configuration definitions or parameterized families; and 183 `GIT_*` symbols with source references. Option mentions include shared fragments and cross-references, rather than an executable argument grammar. Environment symbols also include internal/test-only names. Dynamic subsections, negated options, abbreviations, repeated options, pathspec expressions, revision expressions, hook programs, aliases, transports, and external `git-*` programs require semantic validation; these counts cannot establish completeness.

## Natural tasks and required behavior

| Destination | Actions and details | Required safeguards and evidence |
| --- | --- | --- |
| Changes | Separate staged, unstaged, untracked and ignored paths; inspect binary/text changes, stage or unstage files/hunks, restore selected content, move/remove files, commit or amend | Parse porcelain v2 with NUL delimiters, preserve rename source/destination, index/worktree differences, modes and conflicts. A partial stage must leave the other hunks intact. Never translate an unstage into a destructive reset. |
| History | Graph, commit/tree/blob details, path history, blame, search, compare ranges, reflog, signature verification | Structured object IDs and refs, bounded results and paging. Preserve non-UTF-8 path bytes or report unsupported paths. External diff/text conversion and lazy object fetch can cause execution/network even during inspection. |
| Branches | Create/rename/delete/switch branches, upstreams, merge, rebase, cherry-pick, revert and experimental history replay | Check branch occupancy in all worktrees, dirty paths, detached/unborn HEAD, shallow history and operation state. Review exact ref updates and rewritten commits. Expose conflict resolution and continue/skip/abort only when valid. |
| Conflicts | Inspect base/ours/theirs, content/mode/delete/rename conflicts, binary and submodule conflicts; stage resolved files, continue or abort | Read all index stages. A three-pane text editor cannot resolve every mode/binary/submodule case. `ours` and `theirs` differ in rebase context. Preserve resolved work if an operation fails. |
| Worktrees | List, add, move, repair, lock/unlock, remove and prune worktrees | Distinguish shared common directory from per-worktree HEAD/index/config. Check missing, locked and dirty worktrees. Removing/pruning can destroy filesystem paths or metadata; show exact targets. |
| Remotes | URLs, fetch/push refspecs, fetch/prune, pull policy, push, tags, mirror, shallow/deepen/unshallow, partial-clone backfill | Resolve actual transport, URL rewriting, credential context and remote permissions. Show all source/destination refs, force/mirror/prune/delete scope, atomic support and expected old remote IDs. Use force-with-lease tied to observed refs; a stale lease is a failure, not an automatic retry. |
| Stashes | Inspect, create with selected staged/unstaged/untracked/ignored content, apply/pop, branch, drop/clear, import/export where available | Review inclusion rules and exact stash ID. Preserve stash on failed/conflicted apply. Dropped stash and untracked content have no guaranteed recovery. |
| Patches | Export format-patch series, compare, validate/apply patch, mailbox `am`, continue/skip/abort, mail metadata | Bound file size, distinguish index/worktree application and three-way fallback, validate paths before apply. Mail sending is separate external communication and requires an explicit user action. |
| Bisect | Start with good/bad refs, mark good/bad/skip, inspect log, reset and replay | Retain original branch and current session state. Automated `bisect run` executes an external program and must be a separate trusted workflow with cancellation and visible results. |
| Notes and tags | Notes namespaces/merge/rewrite policies; lightweight/annotated/signed tags, list, verify, delete, push | Separate object changes from ref changes, secret key material from public identity, signature status from signer trust. Tag deletion or remote push needs exact ref review. |
| Submodules | Inspect gitlinks and nested dirty states, add/init/update/sync/deinit/set-branch/set-url, foreach when explicitly trusted | Each submodule is a repository with its own credentials and state. Resolve paths, URLs, recursive scope, `.gitmodules`, absorbed gitdirs and new path configuration. Never silently run an arbitrary foreach script. |
| Sparse and large repositories | Cone/non-cone patterns, sparse index, shallow/partial clone, promisor remotes and backfill | Preview files removed from the worktree and objects that require downloads. Respect out-of-cone changes, server filter support, bandwidth and cancellation. Sparse paths are not deleted repository history. |
| Repository settings | Typed config editor with origins/scopes, includes, identity/signing, attributes/ignore/mailmap, hooks and aliases | Preserve repeated keys and case-sensitive subsection identifiers. Show effective values and their source. Secret/credential/header values must remain masked and excluded from export/history. Includes, executable helpers, filters and aliases need execution trust controls. |
| Objects and refs | Inspect trees/blobs/tags, write reviewed objects, symbolic and direct ref updates, replace refs, index/tree operations | Plumbing can bypass normal user protections. Validate object type/format and use compare-and-swap ref transactions. Show reachability changes and actual index effects; reserve raw object input for an explicit advanced workflow. |
| Maintenance | Count/verify objects, commit graph and multi-pack index, pack refs, repack, GC/prune, scheduling, ref storage migrations | Check concurrent operations and retention policy. A Git reflog is not a backup of untracked files. Pruned objects, expired reflogs and rewritten pack/filter destinations may be irrecoverable. |
| Transfer and integrations | Archive/bundle/export/import; external diff/merge tools, GUI viewers, foreign SCM and mail | Validate archive destinations and import refs; bound streams and subprocesses. GUI/Tcl, Perl/Python, mail clients, foreign SCM helpers, daemon/server components and LFS may be missing from MinGit. Expose precise unavailable reasons instead of a generic success. |

## Native contract recommended to implementation

1. `inspectRepository(path)` returns canonical root, git/common directories, bare/worktree status, object/ref format, detected runtime capabilities, HEAD/ref IDs, operation state, worktrees, index stages and a bounded porcelain-v2 status snapshot.
2. `reviewAction(action, typedPayload)` computes exact repository targets, effects, network/execution needs, conflict risks, capability limits and available recovery. Return a native receipt tied to the repository and HEAD/index/worktree fingerprints.
3. `applyReviewed(receipt)` rechecks state and scope, acquires a repository operation lock, runs bounded argument arrays without a shell, streams redacted progress, supports cancellation, and returns structured success/conflict/partial/failure. State drift invalidates the receipt.
4. After every operation, refresh refs, index, worktree and sequencer state. Expose the resulting operation's continuation actions rather than treating a conflict exit code as an ordinary failed request.
5. Separate inspection from mutation, local filesystem changes from remote updates, and external execution from normal builtins. All result/history records exclude credentials, hook output containing secrets, raw environment values and private signing material.

Argument arrays alone do not neutralize `-c`, shell aliases, hooks, pager/editor programs, credential helpers, filters, diff text converters, SSH commands, remote helpers or repository-controlled configuration. Path/ref/object validation, literal pathspec handling and an explicit trust policy are also necessary. Avoid globally rewriting the user's Git configuration to make the app's parser work.

## State hazards that must have fixtures

Use isolated temporary repositories; never perform these checks on a user's checkout. Test initial/unborn HEAD, detached HEAD, staged and unstaged edits to the same file, added/deleted files, rename pairs, newline/tab/space paths, binary content, symlinks and executable-bit changes, ignored/untracked data, and unmerged stages. Test linked worktrees and dirty/locked/missing worktrees, submodule gitlinks plus nested modifications, sparse paths and shallow/partial history.

For merge/rebase/cherry-pick/revert/am, verify conflicts, continuation, skip and abort restore only the expected state. Test failed hooks/signing/credential prompts, cancelled processes and output bounds. Test stale review receipts, branch occupancy, force-with-lease mismatch, invalid refspecs, remote permission failures and interrupted network operations. Destructive tests must prove the exact reviewed scope and truthfully report what recovery cannot restore.

## Version differences needing controls

The source comparison adds `format-rev`, experimental `history`, and `url-parse` after 2.52.0. Notable newer controls include `add --resolved`, `bisect --reset-when-found`, branch `--delete-merged`, `--dry-run` and `--forked`, switch/checkout `--hard`, rebase `--trailer`, replay `--linearize`, `--ref`, `--ref-action` and `--revert`, and last-modified `--max-depth`/`-z`. The matrix retains the full documented token delta, including cross-reference changes; validate actual runtime help before enabling a control.

Newer configuration includes declarative `hook.<friendly-name>.command/event/enabled/parallel`, event-level hook policies, `hook.jobs`, `alias.*.command`, HTTP retry controls, negotiation restriction/include settings, branch comparison status and submodule path configuration. A trust check limited to files in `.git/hooks` misses configuration-defined execution.

Windows behavior also differs in filesystem case folding, symlinks, executable bits, Unicode normalization/path limits, CRLF and encoding conversion, SSH implementation, locks, process cancellation, quoting, credential helper availability, certificate stores and signing tools. Capability detection and Windows fixtures must verify the packaged executable; Linux success does not establish installer behavior.

## Configuration, environment and optional extensions

Configuration must support system/global/local/worktree/command scopes, conditional includes (`gitdir`, `onbranch`, `hasconfig:remote.*.url`), multivalued keys, origin and scope display, typed boolean/integer/path/date/color parsing, safe removal and rollback of the exact edited file. Command-scoped values should not silently persist globally. Dynamic names such as branch/remotes/drivers/aliases/hook subsections cannot be finitely enumerated; the matrix records their schemas.

Environment controls cover repository/index/object directories, alternate object stores, identity/date, config injection, SSH/HTTP/proxy/authentication, prompts/editor/pager, pathspec behavior, tracing, optional locks and protocol restrictions. Inventory names only. Trace output and URL/header values can contain credentials; never offer a bulk environment export. Test-only and internal symbols should not become ordinary settings controls.

LFS workflows require independent executable/version discovery, endpoint and access checks, tracked patterns and attributes, pointer/content distinction, fetch/pull/push, checkout, locks/unlocks, verification, pruning and reviewed migration. `lfs install` changes hooks/config; migration can rewrite commit IDs; file locking depends on the LFS server. The matrix includes official LFS command references and options, with every entry marked optional and unverified.

Arbitrary extension commands, aliases, hooks, custom transports, filters and user programs are not a finite product API. A complete app must either provide an explicit, reviewed external-program workflow with honest execution limitations, or document unsupported semantics. It must never present discovery of their names as implementation of their behavior.

## Reproducing and interpreting the inventory

Download official source archives outside the repository, verify their commits, then run:

```sh
node scripts/research-git-actions.mjs CURRENT_GIT_SOURCE GIT_2_52_SOURCE docs/coverage/git-action-map.json OPTIONAL_LFS_SOURCE
```

The script only reads supplied source trees and writes the requested report. It does not call repository mutation commands or capture configuration/environment values. The source-derived inventory and independent safety analysis must be followed by action-specific implementation reviews and actual GUI interactions. `not-audited`, `needs-*`, and `not-yet-verified` are open obligations, not passes.
