# Reachable Git command coverage

This map compares implementation checkpoint `ef32b64 + native three-file merge workflow` with all 173 names in the source-derived Git 2.56 inventory. It counts command names, not reviewed task identifiers. The supplemental contrib/subtree helper is recorded separately.

| Fully covered | Partial reachable forms | Missing command contracts |
| --- | --- | --- |
| 0 | 90 | 83 |

Of the partial forms, 88 directly invoke the named command, one delegates GC through `maintenance --task=gc`, and one shows current-branch state derived from `symbolic-ref`. Six missing command contracts have equivalent natural workflows using another native command. Internal helper execution, help text, executable presence and proposed destinations are not direct coverage.

No command is fully covered: the complete form, option and per-control execution audits remain open. Representative native fixtures and selected browser interactions prove narrower behavior. The [machine-readable map](git-command-coverage.json) preserves every audited option mention, exact native form, reachable route, evidence limit and remaining work. Official option mentions include cross-references and are not an argument grammar.

## Per-command routes and gaps

| Audited command | State | Reachable route or concrete gap |
| --- | --- | --- |
| `add` | partial | Changes > Stage selected / Stage |
| `am` | partial | Patches > Import commits; Conflicts > Continue/Skip/Abort |
| `annotate` | missing | Equivalent natural workflow uses blame; this command spelling/output/option contract is not exposed or verified directly. |
| `apply` | partial | Changes > Stage/Unstage hunk; Patches > Apply patch |
| `archimport` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `archive` | partial | Patches > Export archive |
| `backfill` | missing | Sparse checkout > Download promised history objects with bounded path/depth/network preview. |
| `bisect` | partial | Maintenance > Recovery and regression |
| `blame` | partial | Changes > Blame; Maintenance > Inspect repository > Blame |
| `branch` | partial | Branches > Create/Rename/Delete/Upstream |
| `bugreport` | missing | Support > Generate reviewed system/repository report with secrets and machine paths redacted. |
| `bundle` | partial | Patches > Export bundle / Import bundle objects |
| `cat-file` | partial | Maintenance > Inspect repository > Object type/size/contents |
| `check-attr` | partial | Maintenance > Inspect repository > Attributes |
| `check-ignore` | partial | Maintenance > Inspect repository > Ignored files |
| `check-mailmap` | partial | History > Identity mapping |
| `check-ref-format` | partial | Maintenance > Inspect repository > Validate reference name |
| `checkout` | missing | Equivalent natural workflow uses switch/restore; this command spelling/output/option contract is not exposed or verified directly. |
| `checkout--worker` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `checkout-index` | partial | Maintenance > Tracked files > Restore staged contents |
| `cherry` | partial | History > Patch equivalence |
| `cherry-pick` | partial | History > Apply commit; Conflicts > Continue/Skip/Abort |
| `citool` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `clean` | partial | Changes > Delete selected untracked files |
| `clone` | partial | Source control > Clone repository; GitHub repository > Clone locally |
| `column` | missing | No dedicated reachable native task or inspector exists. Implement the proposed natural destination with typed controls and isolated execution evidence. |
| `commit` | partial | Changes > Commit; History > amend through commit editor |
| `commit-graph` | partial | Maintenance > Object storage > Rebuild commit graph |
| `commit-tree` | partial | Maintenance > Object storage > Create detached commit |
| `config` | partial | Repository settings > Search / Set / Remove configuration |
| `count-objects` | partial | Maintenance > Object storage > Object storage |
| `credential` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `credential-cache` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `credential-cache--daemon` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `credential-store` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `cvsexportcommit` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `cvsimport` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `cvsserver` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `daemon` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `describe` | partial | Maintenance > Inspect repository > Nearest tag |
| `diagnose` | missing | Support > Build an explicit reviewed diagnostics archive with destination and privacy preview. |
| `diff` | partial | Changes > View diff |
| `diff-files` | partial | Maintenance > Inspect repository > Index versus working files |
| `diff-index` | partial | Maintenance > Inspect repository > Tree versus index or files |
| `diff-pairs` | missing | History > Compare paired tree/object IDs using supported runtime capabilities. |
| `diff-tree` | partial | Maintenance > Inspect repository > Commit file changes |
| `difftool` | missing | Changes > Launch a native-picked trusted comparison program on reviewed input copies. |
| `fast-export` | missing | Transfer > Export selected references to a fresh native-approved stream file. |
| `fast-import` | missing | Transfer > Validate/import an approved fast-import stream with explicit target ref updates. |
| `fetch` | partial | Remotes > Fetch; Patches > Import bundle reference; Sparse checkout > Deepen |
| `fetch-pack` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `filter-branch` | missing | History > Review a complete rewrite plan and explicitly trust selected transformation programs. |
| `fmt-merge-msg` | missing | Branches > Compose an editable merge message from a selected reviewed integration plan. |
| `for-each-ref` | partial | Branches and Tags lists |
| `for-each-repo` | missing | Maintenance > Select approved repositories and perform typed maintenance per repository. |
| `format-patch` | partial | Patches > Export patches |
| `format-rev` | missing | History > Format selected revision metadata after detecting Git 2.56 capability. |
| `fsck` | partial | Maintenance > Object storage > Integrity check |
| `fsck-objects` | missing | Equivalent natural workflow uses fsck; this command spelling/output/option contract is not exposed or verified directly. |
| `fsmonitor--daemon` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `gc` | partial | Maintenance > Object storage > Run maintenance > gc |
| `get-tar-commit-id` | missing | Patches > Inspect an approved TAR archive for its embedded source commit ID. |
| `grep` | partial | Maintenance > Inspect repository > Search tracked content |
| `gui` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `hash-object` | partial | Maintenance > Object storage > Import object bytes / Store imported blob |
| `help` | partial | Task editor > Help for this task |
| `history` | missing | History > Dedicated drop/fixup/split tools after Git 2.56 capability and rewrite review. |
| `hook` | missing | Repository settings > Inspect, configure and explicitly invoke selected trusted native hooks. |
| `http-backend` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `http-fetch` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `http-push` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `imap-send` | missing | Patches > Review selected mailbox messages, account and destination before explicit external communication. |
| `index-pack` | missing | Object storage > Import/verify an approved pack with explicit storage and retention policies. |
| `init` | partial | Source control > Create repository |
| `init-db` | missing | Equivalent natural workflow uses init; this command spelling/output/option contract is not exposed or verified directly. |
| `instaweb` | missing | Integrations > Explicitly start/stop a local read-only repository viewer with network binding disclosure. |
| `interpret-trailers` | missing | History/Patches > Structured trailer editing and review, with executable trailer commands disclosed. |
| `last-modified` | missing | History > Explore latest changes by tracked path with runtime-aware depth and output controls. |
| `log` | partial | History > Graph / History filters / File history |
| `ls-files` | partial | Maintenance > Tracked files; Inspect repository > Index |
| `ls-remote` | partial | Remotes > Advertised references > selected-branch reviewed fetch |
| `ls-tree` | partial | Maintenance > Inspect repository > Tracked tree |
| `mailinfo` | missing | Patches > Inspect an approved mailbox message and extract reviewed message/patch outputs. |
| `mailsplit` | missing | Patches > Split an approved mailbox into a fresh reviewed output directory. |
| `maintenance` | partial | Maintenance > Object storage > Run maintenance |
| `merge` | partial | Branches > Merge; Conflicts > Continue/Abort |
| `merge-base` | partial | Maintenance > Inspect repository > Common ancestor |
| `merge-file` | partial | Patches or Conflicts > Merge three files > preview > reviewed fresh-file save |
| `merge-index` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `merge-one-file` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `merge-ours` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `merge-recursive` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `merge-recursive-ours` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `merge-recursive-theirs` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `merge-subtree` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `merge-tree` | partial | Branches > Preview integration; Maintenance > Object storage > Preview integration |
| `mergetool` | missing | Conflicts > Invoke a native-picked trusted merge program with explicit input/output files. |
| `mktag` | partial | Maintenance > Object storage > Create detached tag |
| `mktree` | partial | Maintenance > Object storage > Create tree object |
| `multi-pack-index` | partial | Maintenance > Object storage > Rebuild multi-pack index |
| `mv` | partial | Maintenance > Tracked files > Move |
| `name-rev` | partial | History > Reference names |
| `notes` | partial | History > Add note; Maintenance > Commit notes; Conflicts > note resolution |
| `p4` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `pack-objects` | missing | Object storage > Select verified object IDs and review a fresh pack output and compression policy. |
| `pack-redundant` | missing | Object storage > Inspect redundant packs with an explicit preservation plan. |
| `pack-refs` | partial | Maintenance > Reference maintenance > Pack references |
| `patch-id` | partial | History > Identify patch |
| `pickaxe` | missing | No dedicated reachable native task or inspector exists. Implement the proposed natural destination with typed controls and isolated execution evidence. |
| `prune` | partial | Maintenance > Object storage > Prune unreachable objects |
| `prune-packed` | missing | Object storage > Review removal of redundant loose objects already retained in packs. |
| `pull` | partial | Remotes > Pull |
| `push` | partial | Remotes > Push |
| `quiltimport` | missing | Patches > Import an approved quilt series directory with authorship and commit preview. |
| `range-diff` | partial | History > Compare patch series |
| `read-tree` | partial | Maintenance > Tracked files > Load index from tree |
| `rebase` | partial | Branches > Rebase; Conflicts > Continue/Skip/Abort |
| `receive-pack` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `reflog` | partial | Maintenance > Recovery and regression |
| `refs` | missing | Reference maintenance > Inspect/verify/migrate reference storage with runtime-aware review. |
| `remote` | partial | Remotes > Add/Rename/Change URL/Remove/Prune |
| `remote-ext` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `remote-fd` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `repack` | partial | Maintenance > Object storage > Repack objects |
| `replace` | partial | Maintenance > Reference maintenance > Object replacement |
| `replay` | missing | History > Replay selected commits into explicit refs with conflict and compare-and-swap review. |
| `repo` | missing | Worktrees/Settings > Inspect and manage repository registration using supported runtime capabilities. |
| `request-pull` | missing | Remotes/Patches > Compose a reviewable request message from selected local/remote refs. |
| `rerere` | missing | Conflicts > Inspect recorded resolutions and review reuse/forget/clear/gc effects. |
| `reset` | partial | History > Reset branch |
| `restore` | partial | Changes > Unstage / Discard; Maintenance > Tracked files > Restore |
| `rev-list` | partial | Maintenance > Inspect repository > Commit ancestors |
| `rev-parse` | partial | Maintenance > Inspect repository > Resolve reference |
| `revert` | partial | History > Revert commit; Conflicts > Continue/Skip/Abort |
| `rm` | partial | Maintenance > Tracked files > Tracking and deletion |
| `send-email` | missing | Patches > Explicit message/account/recipient preview and send action with native program trust. |
| `send-pack` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `sh-i18n` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `sh-setup` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `shell` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `shortlog` | partial | History > Contributors |
| `show` | partial | History > Commit details; Conflicts > three-way views |
| `show-branch` | partial | Maintenance > Inspect repository > Branch ancestry summary |
| `show-index` | missing | Object storage > Inspect an approved pack index without arbitrary file paths. |
| `show-ref` | partial | Maintenance > Reference maintenance > References |
| `sparse-checkout` | partial | Maintenance > Sparse checkout |
| `stage` | missing | Equivalent natural workflow uses add; this command spelling/output/option contract is not exposed or verified directly. |
| `stash` | partial | Changes > Save stash; Tags and stashes > Apply/Pop/Drop/Recover branch |
| `status` | partial | Source control > Open / Refresh; Changes > grouped file states |
| `stripspace` | partial | History > Normalize draft |
| `submodule` | partial | Working trees > Submodules |
| `submodule--helper` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `svn` | missing | External/integration workflow is not implemented. Needs approved native program/account/file grants, dependency discovery and task-specific reviewed effects. |
| `switch` | partial | Branches > Switch/Create branch; History > Inspect detached commit |
| `symbolic-ref` | partial | Source control toolbar > current branch derived state |
| `tag` | partial | Tags and stashes > Create/Delete/Verify tag |
| `unpack-file` | missing | Object storage > Export a selected blob into a fresh native-approved file. |
| `unpack-objects` | missing | Object storage > Validate/import an approved object pack stream. |
| `update-index` | partial | Maintenance > Tracked files > Index properties / Stage stored blob |
| `update-ref` | partial | Maintenance > Reference maintenance > Update reference |
| `update-server-info` | missing | Remotes > Review generation of local dumb-transport advertisement metadata. |
| `upload-archive` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `upload-archive--writer` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `upload-pack` | missing | Git-owned internal/helper/protocol command. Its parent workflow does not establish a separately reachable command contract; add explicit inspection/lifecycle or typed transfer controls before claiming coverage. |
| `url-parse` | missing | Remotes > Explain a selected URL after detecting Git 2.56 support, with credential redaction. |
| `var` | partial | Maintenance > Inspect repository > Resolved identity and settings |
| `verify-commit` | partial | History > Verify signature |
| `verify-pack` | missing | Object storage > Inspect/verify selected approved pack indexes. |
| `verify-tag` | partial | Tags and stashes > Verify signature |
| `version` | partial | Source control toolbar > actual Git runtime version |
| `whatchanged` | missing | Equivalent natural workflow uses log/show; this command spelling/output/option contract is not exposed or verified directly. |
| `worktree` | partial | Working trees > Add/Move/Repair/Lock/Unlock/Remove/Prune |
| `write-tree` | partial | Maintenance > Object storage > Create index tree |

## Immediate implementation priorities

1. Explicit multi-ref/delete/lease remote policies after the advertised reference chooser.
2. Interactive rebase todo controls with owned native editors and recovery.
3. Recorded conflict resolution (rerere), trailer editing and patch identity.
4. Pack inspection/import/verification and symbolic/ref transaction tools.
5. Explicit trusted regression test/program orchestration and integration/protocol lifecycles.
6. Git 2.56-only workflows must remain gated until the actual runtime is proved.

## Cantonese coverage note

呢個表逐個比較 173 個已審核 Git 指令名稱。90 個指令有部分可到達嘅原生操作，83 個仲未有獨立介面契約，冇任何指令已驗證全部形式同選項。工作流程數目、程式存在或者內部程序執行，唔等於完整指令覆蓋。
