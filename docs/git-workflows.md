# Native Git workspace

Material Git has a dedicated Source Control workspace backed by the selected native Git executable. It opens repository folders through the native picker and retains opaque grants in the main process. Renderer requests contain task fields, never executable paths, shell input, command fragments or arbitrary working directories.

The Changes destination shows the index and working files separately, plus untracked files. Whole-file and individual text-hunk staging use the real Git index. Commit, amend, optional author override and signing each receive an exact review. Binary, added, deleted and renamed files use whole-file staging. Untracked files are preserved by Discard. Symlink files and filenames containing line breaks currently require another filesystem workflow.

History contains a commit ancestry graph generated from actual parent object IDs, commit details, file history, blame, notes, cherry-pick, revert and reviewed reset modes. Graph edges outside a page continue below it. Branch actions create, switch, rename, merge, rebase and delete merged branches. Git protects occupied branches and dirty working files.

Remotes supports explicit fetch, pull strategy, single-reference push, remote add, rename, URL change and removal. Push never adds force. Account identity follows the selected remote URL and trusted credential helper configuration. No remote mutation is performed by the test suite.

Tags and stashes support creation, signing, deletion, saving, apply, pop and drop. Working trees supports native-picked addition, lock, unlock, clean removal and pruning missing registration entries. Submodules supports add, initialize/update, sync and deinitialize with selected recursive behavior.

Conflicts shows the base, current and incoming versions next to an editable resolution. A reviewed resolution atomically replaces the selected file and stages it. Merge, rebase, cherry-pick, revert and mailbox import can continue or abort; eligible operations can skip. Recognized credentials in a conflict refuse this editor rather than silently replacing them with redacted text. Resolve those files in a protected editor, then stage them.

Patches imports native-picked patch bytes, applies or reverses them in the worktree or index, imports mailbox commits, and exports a selected number of commit patches into a fresh directory. Sparse checkout has selected directory cones and disable controls. Shallow clones and deepen operations are supported; partial clone uses blob-on-demand filtering.

Repository Settings displays every stored key with its scope and origin, including included configuration. Search is adjacent to the application's regex builder. Arbitrary valid section.key names can be reviewed for set/unset at local, enabled worktree or explicitly selected global scope. Secret keys cannot be written through this ordinary editor, and existing secret values are masked. Worktree scope refuses a silent local fallback when extensions.worktreeConfig is disabled. Executable aliases, named hooks, filters, merge/diff programs, credential helpers, SSH programs, signing tools and include directives are marked for inspection. This interface does not execute aliases.

Advanced workflows include note append/copy/merge/prune with an editable notes-conflict recovery path; stash recovery onto a branch; explicit upstream tracking; detached commit inspection; sparse add/reapply; linked working tree move/repair; submodule metadata absorption and tracking/URL changes; commit/tag signature verification using a disclosed signing program; tracked-file rename, removal, revision restoration and index properties; bundle import/export/reference fetch; revision archives; selected untracked file cleanup; exact recovery entry deletion; and reviewed object packing, graph/index rebuilds and pruning. Destructive choices are explicit and receive single-use review. Bundles are copied into owned immutable input storage before use.

Maintenance includes real index, reference, recovery log, object storage, integrity, attribute, ignore and blame inspectors. Reviewed actions run object maintenance, reference packing, recovery expiration, bisect start/good/bad/reset, notes, object replacements and compare-and-swap reference updates.

## Native safety and recovery

Writes use single-use reviews that expire after five minutes. Reviewed file input is limited to 64 MiB per changed file and 128 MiB in aggregate, with complete bytes hashed within those limits. Their native plan is bound to HEAD, index, working files, operation state and configuration fingerprints. A changed state invalidates the review before mutation. New repository reviews bind the native-picked parent and require an unoccupied destination. Exports require a new output directory.

All subprocesses use separate argument arrays with shell disabled. Filename arguments follow the end-of-options separator where supported. Paths are relative to an approved native root; traversal, metadata directory access and escaping symlinks are rejected. Reads disable external diff, textconv, filesystem monitors and automatic maintenance. Untrusted writes disable directory hooks and credential helpers and reject external/custom transport protocols. Remote operations never silently push submodule references. Configured filters or named hooks require explicit repository program trust for tasks that can execute them. Trust resets when another repository is opened. Signing also requires this disclosure.

The main process caps output at 2 MiB and kills the owned process group on cancellation or timeout. Cancellation and nonzero exits report possible partial effects, and the GUI refreshes actual repository state. The application must retain its quit/update guard while a Git request or draft review remains active. GitService.close() cancels owned subprocesses and removes its owned temporary hook directory.

## Verified behavior and remaining scope

The native fixture suite isolates Git configuration and creates owned temporary repositories. It verifies staging and unstaging preserve independent contents, selected-hunk staging, stale and single-use receipts, symlink/path boundaries, directory hook suppression, included executable configuration disclosure, secret masking and fingerprint invalidation, actual branch/tag/stash arguments, real merge conflict editing and continuation, actual process-group cancellation, reviewed initialization patch export, alias-help rejection, full content fingerprints above display limits, bare repository inspection, and browser interactions that stage/unstage through the real native service and render the ancestry graph. The extended fixtures also verify notes conflict completion, sparse cone extension, native-picked linked tree movement, actual ZIP and bundle import/export, isolated real signing keys and signature trust results, submodule metadata/branch/URL changes, tracked file restoration, explicit deletion, index flags and real object packing/graph maintenance. TypeScript checks the native and renderer contracts.

These checks do not establish Windows installer interaction, bundled Git execution, live remote authentication, recursive submodule network behavior, every maintenance variant or the complete Git CLI. The audit in `coverage/git-actions-audit.md` is the authoritative exhaustive inventory and distinguishes implemented evidence from pending coverage.

The workspace currently exposes 98 reviewed task identifiers, 17 repository inspectors and the core inspection actions. That is task coverage, not a claim that all 173 audited Git entries or all documented options have a GUI. Remaining groups include interactive rebase todo editing and sequencer scripting, replay/history experimental tools, gitk/gui and interactive terminal-only tools, daemon/server protocols, mail-send credentials, arbitrary filter drivers, custom merge tools, low-level object creation/index update pipelines, bundles/archives, credential-store editing, full bisect command automation, every merge strategy option, full reflog/reference transaction batching, multi-path restore variants, scripted submodule foreach, and version-specific options introduced after the available runtime.

The renderer is a registered Material Web/Lit composition and uses shared theme tokens, narrow layouts, reduced-motion rules, keyboard controls, bounded list pages and custom scrollbar styling. Native Git output and repository-owned data retain their original factual wording. English and Cantonese navigation, primary actions, task descriptions and editor field labels are provided. Native diagnostics and ancillary explanatory copy retain literal English where no reviewed translation is present.

# 原生 Git 工作區

版本管理工作區會用原生檔案選擇器開啟儲存庫，實際讀取 Git 暫存區、工作目錄、分支同提交歷史。每個寫入操作都要先檢查，確認會綁定當時嘅 HEAD、暫存區、檔案同設定。狀態改變會令確認失效，取消或者操作出錯之後會重新讀取真實狀態。

介面提供分開嘅已暫存、未暫存同未追蹤清單、逐段暫存、提交、分支、遠端、標籤、暫存、工作目錄、子模組、修補檔、衝突解決同維護工具。衝突編輯器並排顯示共同版本、目前版本同傳入版本，再用確認後嘅內容解決。程式信任會喺開啟另一個儲存庫時重設。

目前測試用隔離嘅臨時儲存庫確認原生 Git 行為，唔會改動用戶遠端。完整 CLI、每個選項、Windows 安裝互動同未驗證嘅網絡工作流程仍然要按覆蓋報告逐項完成，唔會因為有操作名稱就當作全部完成。
