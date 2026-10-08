# GitHub functional gaps in the desktop

Material Git has real domain workspaces and reviewed native actions, but it does not yet provide complete GitHub CLI or API parity. This audit traces all **196 pinned GitHub CLI leaves** to the privileged implementation and actual mounted desktop controls. It distinguishes authored controls, narrower alternatives, missing controls and unavailable runtime behavior. Registry membership, a help entry, an API schema record and a successful fixture are different evidence.

**Audited application source:** `b36d555d589fd1fe0dcdfbe8bfaeca7bb98dcf10`, merged into the isolated documentation checkout before inspection. **Checked:** 2026-10-08 UTC. No remote mutation, credential output, user configuration change or live permission experiment was performed. Later integration changes must be assessed separately; this is an exact-source report, not a claim about a moving main branch.

## Later bounded integration evidence

The original source classification and per-leaf tables below remain historical. Subsequent contributions address the reachability of the six Codespaces flows, selected-run deletion and Copilot assistance. They do not certify every option, live permission or installed-platform behavior.

| Contribution | Concrete change | Verification and remaining boundary |
| --- | --- | --- |
| `e4b9bffad5ad6af8e566975160968d040251e159` | Selected Codespace Connection, Files and Ports areas mount SSH configuration/fixed diagnostics, stable/Insiders/web editor, JupyterLab, copy, forwarding and visibility forms. The [workflow component](../src/renderer/cli-workflows.ts) inherits the selected name and explicit hostname without a command selector. [Native reviews](../src/main/cli-workflows.ts) bind host, account, provider target and local-path receipts; cancellation addresses only an issued operation. | The [compiled-component regression](../tests/cli-workflows-render.test.ts) exercises the actual contextual mount, review, cancellation and discard. Native fixtures check account/target drift and local path replacement. No live Codespace, external editor/Jupyter installation, interactive SSH session or Windows process-tree success is claimed. Interactive SSH/PTY, `all-interfaces` and larger owner/repository selection semantics remain open. |
| `0f57b70b1295e2add1354f1ddeb6d2966430a8cb` | A selected workflow run has a Delete action, separate from workflow selections. The [native service](../src/main/github.ts) prepares an exact target review bound to run ID, workflow ID, commit and attempt; the [domain editor](../src/renderer/github-workspace.ts) requires two acknowledgments and a confirmation slider. Successful deletion reloads the run list; provider refusal stays a failure. | The [compiled deletion regression](../tests/github-run-delete-render.test.ts) drives the actual controls and checks the exact review receipt. Native tests reject attempt drift and replay, and preserve permission failure without reporting deletion. These are synthetic provider fixtures; no live run or artifacts were deleted. |
| `62ac84348019120ec16c64cbac4a25eceb311df1` | [Tools](../src/renderer/tools.ts) mounts [Copilot assistance](../src/renderer/copilot.ts): Explain command, Suggest command and setup/version. Model requests require a successful actual installed-help read advertising prompt and tool-denial options. Reviews bind the installed executable contents and selected GitHub context. Bounded literal text is passed as separate arguments with every model tool denied; answers are displayed literally and never executed. | [Native capability tests](../tests/copilot-workflows.test.ts) cover advertised flags, executable replacement and a real Node help process that cannot establish Copilot support. The [compiled Tools regression](../tests/copilot-render.test.ts) covers reviewed help, Explain/Suggest, real Material choices, cancellation, literal output, explicit discard and aggregate child activity. Copilot uses its own sign-in, entitlement and provider settings; these fixtures do not establish a live model request, Enterprise provider support or Windows launch. Startup configuration/hooks remain external code disclosed during review. |
| `f355579` and `e449860` | Stored CLI reviews enforce exact command and productive destination locks through [native security callbacks](../src/main/main.ts). The [app shell](../src/renderer/app.ts) passes its approved hostname to Tools and calls `MaterialTools.discardDrafts()` only after successful native discard and a busy recheck. | The Copilot component exposes that scoped method, preserving converter results. Account/host changes invalidate native reviews; cancellation remains available for owned operations after lock expiry. The combined main build/full-suite result must be attributed to its final integrated source, rather than inferred from these separate checkpoints. |
| `f90d477e325474763fcbe9d667682372580147af` and `9d34b98924ed2cd673c81ec74de8910acbad82c1`, with native consumers `09abd10` and `c52c3e2` | Selected repository/gist **Clone locally** and selected PR **Check out locally** now mount an [opaque-source Git handoff](../src/renderer/github-git-handoff.ts) in their own contextual areas. The [native registry](../src/main/github-provider.ts) freshly binds approved host/account/provider identity, canonical source and exact PR head. Source/review cleanup is awaited; failed cleanup preserves the draft. | [Compiled selected-record fixtures](../tests/github-git-handoff-render.test.ts) verify visible PR numbers distinct from database IDs, explicit host, opaque Git review propagation and cleanup ordering. Separately, [native HTTPS Git fixtures](../tests/git-provider.test.ts) verify actual clone and exact-head checkout, matching remotes, preserved local contents, changed targets, concurrent edits, cancellation and partial results. These are separate boundary proofs, not a live GitHub-to-local end-to-end outcome or all-six-handoff completion. |
| Compact consumer `e25b13b` and the subsequent branch-choice integration | Pending provider tasks show clone/checkout controls instead of unrelated Source Control chrome. Repository clone branches use [live native choices](../src/main/choices.ts) with explicit canonical repository/approved host, real pagination and branch search. Edited fields and selected branches survive result/activity updates; active branch reads keep the owning workspace busy. | The compiled handoff regression drives actual Material branch selection, next page and search, checks exact reviewed branch values, rejects discard during a deferred choice read and verifies compact task chrome. Native choice tests independently check provider pagination and GraphQL branch-search variables. Gists have no repository-branch REST picker. [Handoff limitations](github-git-handoff.md) retain independent Git transport credentials, missing local Sync/issue development/revert workflows and incomplete clone/checkout flag variants. |
| Selected remote synchronization follow-up | Selected repository → **Synchronize branch** mounts `repositories.synchronize` with live source-repository and branch choices. The [remote adapter](../src/main/github-sync.ts) binds both repository identities and branch commits, compares divergence, requires an explicit reset for discarded commits and revalidates the native stored review before Apply. | [Native and compiled Material fixtures](../tests/github-sync.test.ts) cover drift, reset safeguards, replay, refused writes and uncertain verification. The provider update is an isolated in-memory fixture. The helper now has 104 distinct contextual CLI leaves; the original 103-row audit stays source-bound below. Local omitted-destination synchronization, full clone/checkout flags, live permissions and unified provider-to-local outcomes remain open. Force reset cannot provide atomic expected-old-commit protection through GitHub's reference API. |
| Approved Enterprise configuration follow-up | The [configuration page](../src/renderer/cli-config.ts) lists native-approved host scopes. [Native reads/reviews](../src/main/cli-config.ts) use exact hostnames; Global compares the selected native host, and stored reviews reject revoked hosts or changed values before writes. | [Pinned CLI fixtures](../tests/cli-config.test.ts) read and write an isolated Enterprise config directory, preserving Global/public-host values. The [compiled Material fixture](../tests/cli-config-render.test.ts) selects the actual Enterprise scope and applies an exact two-acknowledgment review. No credential file contents or live server permissions are tested. Routing/socket adapters, external program arguments and true inheritance reset remain unavailable; equal values remain ambiguous. |

The focused helper checkpoint passed TypeScript and **32 affected tests**, with no failures or skips. The subsequent combined main source `8ba0410710f8b66a0c7f94867147ce31af8727d0`, including the Copilot, Tools host/discard and final Tools contributions, passed **388 tests with zero failures or skips**. Those tests cover local native processes, injected provider responses and compiled Material components in isolated Chromium. They do not replace actual desktop/provider scenarios. Action-inventory checks still report inventory completeness with functionality uncertified; the feature ledger still reports **104 rows and 161 unresolved surface obligations** at this checkpoint. Native preview remains a PTY implementation gap: the local Material prompt demonstration does not execute `gh preview prompter`. Full-option parity, the other per-leaf gaps and permission/platform limits in the original audit remain open.

## Evidence and method

| Evidence | What was traced |
| --- | --- |
| [Pinned CLI inventory](../data/gh-catalog.json) | GitHub CLI 2.102.0, every one of 196 leaves and its modeled arguments/options. |
| [Native routes](../src/shared/github-native.ts), [contextual areas](../src/renderer/github-workspace-actions.ts) | 103 distinct CLI leaves, each assigned to exactly one visible domain area. |
| [App shell](../src/renderer/app.ts), [domain workspace](../src/renderer/github-workspace.ts), [request model](../src/renderer/github-workspace-model.ts) | Destination mount, selection, list/detail request, contextual action button, editor and request construction. |
| [Task widget](../src/renderer/github-task.ts), [GitHub service](../src/main/github.ts), [engine](../src/main/engine.ts) | Typed definition, option controls, preparation, reviewed immutable request and native execution. |
| [Local workspace](../src/renderer/github-local-workspace.ts), [workflow service](../src/main/cli-workflows.ts), [older workflow component](../src/renderer/cli-workflows.ts) | Reachable Extensions/Aliases controls versus defined but unmounted Codespaces/Copilot helpers. |
| [Accounts](../src/renderer/accounts.ts), [authentication service](../src/main/auth.ts), [host registry](../src/main/auth-hosts.ts), [main integration](../src/main/main.ts) | Account/host selection, permissions UI and native authorization wiring. |
| [API explorer](../src/renderer/api-explorer.ts), [typed controls](../src/renderer/api-controls.ts), [form model](../src/renderer/api-form.ts), [API service](../src/main/github-api.ts) | Schema-driven executable requests, typed omission/defaults, bounds, native upload grants and review binding. |
| [API catalogue](../data/github-api-catalog.json), [GraphQL source](../data/github-graphql-schema.graphql) | Metadata inventory and pinned provider schema; these are not a tally of working contextual workflows. |
| [Streaming queue](../src/main/downloads.ts), [download component](../src/renderer/downloads.ts) | Native transfer implementation and independently tested component, distinct from app integration. |

The complete tables below account for each pinned leaf once. A native contextual row was checked against the route, its area, `nativeAreaView()` and the mounted `mg-github-task`, rather than counting routes alone. The remaining leaves were checked against legacy domain methods, Accounts, API explorer, CLI configuration and the mounted local workspace. No unrestricted command catalogue is treated as the product interface.

Focused verification at the audited source ran:

```sh
node --import tsx --test tests/github.test.ts tests/github-workspace-actions.test.ts tests/github-api.test.ts tests/engine.test.ts tests/cli-config.test.ts tests/api-form.test.ts tests/api-pagination.test.ts tests/downloads.test.ts tests/downloads-render.test.ts
```

**114 tests passed, zero failed, zero skipped.** These include mocked provider requests, request/review boundaries, typed forms, cursor behavior, local temporary fixtures, and a compiled Material download component driving a native queue against a local HTTP fixture in isolated Chromium. The test output was retained during this audit as a temporary local record; it is not a committed live-GitHub receipt. In particular, the queue browser fixture injects its own client and provider. It does not prove that the desktop shell mounts that queue or that a real GitHub asset was downloaded.

Earlier actual desktop read/navigation evidence is recorded in [local verification](local-verification.md), with its own source revisions. It supports only the recorded interactions. Neither that evidence nor this focused run proves all mutations, token permissions, Enterprise behavior, Windows installation or every flag combination. A previously reported full-suite count is not attributed to this tree without a matching run.

## Concrete gaps to close next

1. **Finish streaming downloads through the actual desktop.** At this source, Assets and Artifacts have Download buttons that open a real reviewed legacy `gh release download` / `gh run download` flow. They are not missing downloads. However, `mg-downloads` is neither imported nor mounted by `app.ts`, and `main.ts` does not construct the new queue or expose its bridge. Wire exact selected provider ID, approved host, account fingerprint and save picker; add a reachable queue destination and events; include active downloads in close/update guards. Verify pause/resume/retry and completed-file preservation in the installed app. Keep archive/pattern/clobber/output semantics explicit rather than silently substituting the queue.
2. **Carry approved host through every domain operation.** Accounts can approve/sign into Enterprise, and API explorer selects approved hosts. Domain `DomainPayload`, shell mount and contextual helper mount supply no hostname. `resolveHost(host='github.com')` therefore selects public GitHub for these requests. Add a visible domain context and propagate it through lists, details, choices, review, watcher, uploads and downloads. Bind drafts and selection to host/account; prevent a previously selected entity from surviving a context change as an apparently valid target. Test two hosts with equal repository names and entity numbers.
3. **Add native authorization and host/account binding to local workflow reviews before exposing more helpers.** The current `CliWorkflowsService` plan binds argv, executable, folder, expiry and file fingerprints, but not a reviewed account/hostname. Its `main.ts` IPC handler calls the service directly, without the `GitHubService` authorization callback. Existing destination controls do not establish native action authorization. Add service-level checks and consume applicable surface unlocks after success. For operations that use provider credentials, account/host changes must invalidate review. Preserve local-only operations without inventing a network dependency.
4. **Mount the six missing Codespaces local flows contextually.** The older `mg-cli-workflows` component is never mounted by the current app/domain components. Add selected-workspace SSH configuration/diagnostics, external editor/Jupyter launch, reviewed copy, forwarding and visibility controls. Report missing programs/services and owned-process lifetime accurately. Provide account/host context first. Do not restore a command catalogue as navigation.
5. **Provide a truthful Copilot destination or visible unavailable state.** Its backend detects a separately installed executable and supports help/version or a bounded prompt with all tools denied. No mounted app flow reaches it. This is narrower than interactive Copilot, agent tool execution, removal and arbitrary installed-version semantics. Installation, entitlement and service availability need their own evidence. Native preview/PTY and shell completion also need an explicit product decision rather than being described as complete.
6. **Connect GitHub selections to local Git outcomes.** Existing Source Control tasks and the reviewed clone follow-up after repository creation/forking are valuable. They do not supply existing-repository Clone/Sync, selected-gist clone, issue-linked branch development, selected-PR checkout or creation of a revert PR. Add typed local-repository selection and exact target/head/ref binding, staged/unstaged/untracked preflight, remote/refspec review, conflict handling and verification. A local commit revert is not a GitHub revert-PR workflow.
7. **Close narrow legacy editors and missing actions.** Add the native-but-unreachable run Delete action. Prioritize gist file content/add/remove, comment edit/delete/attachments, issue close reason/duplicate target, run job/attempt/debug controls, workflow ref-specific YAML, release draft/prerelease/latest/tag/overwrite/archive choices, and Codespace creation machine/region/devcontainer/retention choices. The per-leaf table identifies the precise currently absent fields. Each needs real native preparation and result/error handling, not a renamed button.
8. **Verify advanced option combinations and provider failures.** The 103 helper controls are source-reachable, but most flag combinations have no installed-app/provider proof. Exercise representative scoped secrets/variables, keys, project field/item values, attestations, agents/skills, file outputs, merge policies and enterprise unsupported features. Use safe read-only and negative fixtures first; remote writes need separately authorized scenarios. Preserve permission/service/platform failures as failures and partial effects as uncertain until state is reread.

## Contextual helper behavior and limits

`GitHubService.nativeDefinition()` starts with pinned command metadata and enriches entities. The widget actually offers switches, choices, repeatable values, numeric fields, multiline content, local file/folder pickers and paged live entity choices. Labels, users, branches, tags, workflows, projects/fields/items, environments, secrets, variables and keys use specific native sources. The main process validates known keys and separate argument arrays; the UI is not a terminal. Search and picker filtering remain bounded/page-specific.

The helper path binds selected issue/PR/run/gist/workflow/Codespace targets where modeled. File paths must resolve inside the approved workspace; stdin `-` is unavailable. Mutation preparation produces a server review, and applying it cannot replace the values. Native confirmation flags are inserted after review rather than offered as an unchecked authorization bypass. Secret-type option values are excluded from cached task drafts. Cached nonsensitive helper drafts are bounded and memory-only. This does not establish that arbitrary text or provider records are free of credentials.

Specific adaptations prevent the 103-row count from meaning complete CLI parity:

| Area | Actual behavior and remaining distinction |
| --- | --- |
| Browser/editor/terminal flags | `web`, `editor` and `yes` are hidden from helper controls; browser/editor execution is rejected by the generic engine. Validated domain links and app editors serve particular tasks, not every CLI web/editor flag. Interactive commands need a dedicated runtime. |
| Result formatting | Helper definitions retain modeled JSON/result-field/jq/template controls where present. Read tasks default to JSON/format=json when supported. Legacy domain views and the API explorer have different fixed-field/export contracts. Do not describe output transforms as either universally absent or universally implemented. |
| Lists and output | Native helper output has a bounded process/result size, and CLI limit results are not an exhausted provider collection. Legacy REST lists use real next links; GraphQL lists use remembered cursors. Text/regex searches in several workspaces filter a current page. |
| Repository creation/fork | Contextual create/fork uses owner/template/team/license/gitignore/visibility choices. Local clone/push/source/remote options are removed from that operation. Successful provider read offers a separately reviewed native Git clone. Existing-repository clone/sync is still a separate gap. |
| Workflow dispatch | CLI JSON stdin becomes a native-picked JSON-object file up to 64 KiB, or structured field/raw-field rows. Primitive types are preserved; mixed input sources and changed files fail before dispatch. `ref` is explicit. This is a bounded adaptation, not arbitrary stdin. |
| Run watch | Uses actual provider polling rather than spawning the terminal watcher. Interval is 1–300 seconds, duration 10–1,800 seconds, default 900. Compact/exit-status behavior is modeled. A sample includes the first 100 jobs with a notice; it is not an unlimited job stream. Stopping the watcher does not cancel the workflow. |
| Local helpers without authentication | Some native tasks can prepare without fetching account credentials, but `nativeAreaNavigation()` disables every area while the domain is unauthenticated. Offline/local default-context/cache/skill tasks therefore need a separate availability decision. |
| Extensions and aliases | Current Extensions/Aliases mounts use `mg-github-local-workspace`, not the older full workflow component. Install force/local-folder, upgrade all/dry-run/force, alias delete-all and alias arguments/clobber/shell controls are narrower or absent in that mounted editor. Execution forwards separate arguments but provides no PTY/stdin or per-publisher option schema. |
| External processes | SSH/editor/Jupyter, extension programs, local build dependencies and repository-controlled programs have real OS/service semantics. A defined adapter does not prove installation, launch success, safe platform behavior or unrestricted extension parity. |

For Codespaces, the unmounted backend supports SSH-config export and fixed diagnostic profiles, profile/server-port/debug controls, bounded copy paths with explicit remote expansion, and bounded forwarding/visibility mappings. Interactive SSH and native preview require PTY support that is not present. The forwarding adapter does not accept `all-interfaces`; repository/owner context filters from CLI help are not fields in these older workflow requests. Remote shell expansion is a reviewed external-code action, not literal file copying.

## REST and GraphQL: schema support versus executable GUI support

The pinned catalogue contains **1,232 REST operations**, **816 paths**, **44 categories**, **1,829 GraphQL named types**, **8,419 fields**, **31 query-root fields** and **278 mutation-root fields**. These describe schema coverage. The API explorer is a real executable advanced GUI, and the domain service has additional fixed REST/GraphQL adapters, but neither count measures completed natural workflows or live authorized requests. There is no defensible all-endpoint live-success count from this audit.

Pinned provider sources are REST commit `2eba8c3ba02f022011539cf01efc43e0251502f8` and GraphQL documentation commit `7b807926df3ccb7f3d1bcd4ad1c652fb42b0931d`. Their full URLs/hashes are in [the catalogue](../data/github-api-catalog.json). The earlier [upstream comparison](coverage/github-actions-audit.md) records its own latest-at-check commits and byte-identical schema comparison. This bounded source audit did not refresh upstream; it does not relabel that historical comparison as current research.

| Surface | Executable GUI support at this source | Remaining boundary |
| --- | --- | --- |
| Domain workspaces | Fixed lists/details and reviewed domain mutations; paged entity choices, record editors and 103 contextual helpers. | Many CLI options and some native actions lack controls. Host propagation is incomplete. Schema metadata cannot fill those gaps. |
| REST explorer | Declared operation selection, typed path/query/header/body controls, omission/default/null distinctions, enum/object/list alternatives, reviewed writes, issued next-page links, selected response views and native export. | Cookie parameters, unsupported schema keywords, undeclared headers/media, automatic all-page collection and arbitrary CLI coercion are not generic supported workflows. Operation-specific validity and server patterns need provider validation. |
| Binary API requests/results | Native picker grants snapshot upload bytes; declared release-upload origin; actual bounded binary response export callback. | Upload grants are capped at 64 MiB; responses at 4 MiB. Large streaming downloads require integrated queue behavior, and artifact archive lengths differ from unpacked metadata sizes. |
| GraphQL explorer | Typed selections, aliases, inline type fragments, nested typed arguments, generated validated documents and reviewed mutations. Type catalogue browsing is separate from execution. | Depth 16/500 selected fields, bounded references, custom scalar/server policy concerns, no arbitrary document/variable/directive/named-fragment editor. Browsing 1,829 types does not execute them. |
| API pagination | REST follows only issued same-host/same-path links. GraphQL uses actual response cursors for supported forward connections. | No `gh api --paginate --slurp` equivalent collecting all pages. Partial responses, multiple advancing connections and repeated array connections need explicit handling. |
| API request options | Approved-host selector, declared Accept/API version, read cache choices, allowlisted declared headers. | No arbitrary jq/Go-template program, arbitrary cache duration, preview/header/stdin semantics or every terminal output mode. Authentication headers remain native-managed. |
| Enterprise | Native-approved exact HTTPS origin records and explicit API-host selection exist. | Public schema does not guarantee a particular GHES version/service. Domain host selection remains missing, configuration scopes are Global/github.com only, and Unix-socket/api-host overrides require separate adapters. |

Representative form/permission checks covered real source paths, not just inventory: `repos/upload-release-asset` uses the specific approved upload origin and native grant, declared REST union bodies reject conflicting identifiers, GraphQL enum/input validation builds literal AST selections, and response errors preserve partial data without reporting success. The focused tests also rejected unapproved hosts, account switches, replay, expiry, changed host registrations, changed input files and forged pagination links. They use controlled transports and therefore establish invariants, not real account permissions.

## Authentication, review and permission conclusions

GitHubService resolves approved hosts natively, checks registered action locks through its main integration, and binds mutation reviews to account, host, exact prepared request and provider target snapshot. Application `apply` accepts only the issued review ID and confirmation; it consumes the receipt before replay can execute. Revalidation occurs before the write. Native process failure can have partial effects; the service reports that uncertainty and calls for a provider refresh rather than claiming rollback.

API mutation reviews separately bind prepared host/account and immutable request/upload bytes, reject changed host registrations and account identity, and clear single-use receipts. Accounts offers host registration, browser/device sign-in, selected-account switch/logout, scope add/remove/reset and reviewed credential copying. It is not a general token editor. API/domain headers and logs redact managed credential fields; sanitized display cannot grant permission.

The older local workflow service is materially different: expiry/fingerprint-bound plans exist, but its current implementation lacks the above account/host and native lock callback wiring. That is an implementation gap, not evidence of successful unauthorized execution, because this audit did not attempt one.

Real reads depend on repository visibility; GraphQL requires authentication; writes/admin operations additionally depend on account, token, organization, repository and enterprise policy. HTTP 403, unavailable Codespaces/Copilot, missing local programs, unsupported GHES services and untested Windows behavior must be reported separately from an absent GUI control. No live write, new OAuth authorization, scope sufficiency or installation success was established here.

## Complete leaf trace

The following 196 rows partition the pinned leaf inventory once: 103 C, 77 R, 8 B, 6 G and 2 U. C and R mean source-level reachable controls with partial/unverified parity; neither means a completed feature. B means a native adapter lacks a reachable action, G means the GitHub-to-local-Git contextual outcome is absent or narrower, and U means no supported desktop-native equivalent. Permission or platform blockers can additionally affect every row.

### Contextual helper leaves (C: 103)

Every row follows the registry → native area → action button → mounted task widget → definition/prepare/review/apply path. See the shared contextual limits above. These rows describe where a user can start the task, not proof that every option combination or provider permission works. The domains are internal destination IDs, while area names are visible English labels.

| CLI leaf | Native action | Contextual home |
| --- | --- | --- |
| `codespace edit` | `codespaces.configure` | codespaces → Workspace settings (selected record) |
| `codespace logs` | `codespaces.logs` | codespaces → Workspace settings (selected record) |
| `codespace rebuild` | `codespaces.rebuild` | codespaces → Workspace settings (selected record) |
| `discussion edit` | `discussions.edit` | discussions → Edit discussion (selected record) |
| `gist rename` | `gists.rename-file` | gists → Manage files (selected record) |
| `gist view` | `gists.inspect` | gists → Manage files (selected record) |
| `issue create` | `issues.create-with-properties` | issues → My work & new issues |
| `issue status` | `issues.status` | issues → My work & new issues |
| `issue delete` | `issues.delete` | issues → Manage issue (selected record) |
| `issue edit` | `issues.configure` | issues → Manage issue (selected record) |
| `issue lock` | `issues.lock` | issues → Manage issue (selected record) |
| `issue pin` | `issues.pin` | issues → Manage issue (selected record) |
| `issue transfer` | `issues.transfer` | issues → Manage issue (selected record) |
| `issue unlock` | `issues.unlock` | issues → Manage issue (selected record) |
| `issue unpin` | `issues.unpin` | issues → Manage issue (selected record) |
| `pr create` | `pulls.create-with-properties` | pull-requests → My work & new requests |
| `pr status` | `pulls.status` | pull-requests → My work & new requests |
| `pr checks` | `pulls.checks` | pull-requests → Review tools (selected record) |
| `pr diff` | `pulls.diff` | pull-requests → Review tools (selected record) |
| `pr edit` | `pulls.configure` | pull-requests → Review tools (selected record) |
| `pr lock` | `pulls.lock` | pull-requests → Review tools (selected record) |
| `pr merge` | `pulls.merge-with-options` | pull-requests → Review tools (selected record) |
| `pr ready` | `pulls.ready` | pull-requests → Review tools (selected record) |
| `pr unlock` | `pulls.unlock` | pull-requests → Review tools (selected record) |
| `pr update-branch` | `pulls.update-branch` | pull-requests → Review tools (selected record) |
| `project close` | `projects.close` | projects → Project settings (selected record) |
| `project copy` | `projects.copy` | projects → Project settings (selected record) |
| `project field-create` | `projects.field-create` | projects → Manage fields (selected record) |
| `project field-delete` | `projects.field-delete` | projects → Manage fields (selected record) |
| `project field-list` | `projects.field-list` | projects → Manage fields (selected record) |
| `project item-add` | `projects.item-add` | projects → Manage items (selected record) |
| `project item-archive` | `projects.item-archive` | projects → Manage items (selected record) |
| `project item-create` | `projects.item-create` | projects → Manage items (selected record) |
| `project item-delete` | `projects.item-delete` | projects → Manage items (selected record) |
| `project item-edit` | `projects.item-edit` | projects → Manage items (selected record) |
| `project item-list` | `projects.item-list` | projects → Manage items (selected record) |
| `project link` | `projects.link` | projects → Project settings (selected record) |
| `project mark-template` | `projects.mark-template` | projects → Project settings (selected record) |
| `project unlink` | `projects.unlink` | projects → Project settings (selected record) |
| `release create` | `releases.create-with-options` | releases → Prepare release |
| `release delete-asset` | `releases.delete-asset` | releases → Verify release (selected record) |
| `release verify` | `releases.verify` | releases → Verify release (selected record) |
| `release verify-asset` | `releases.verify-asset` | releases → Verify release (selected record) |
| `repo create` | `repositories.create-with-options` | repositories → Create or fork |
| `repo archive` | `repositories.archive` | repositories → Repository settings |
| `repo autolink create` | `repositories.autolink-create` | repositories → Repository settings |
| `repo autolink delete` | `repositories.autolink-delete` | repositories → Repository settings |
| `repo autolink list` | `repositories.autolink-list` | repositories → Repository settings |
| `repo autolink view` | `repositories.autolink-view` | repositories → Repository settings |
| `repo deploy-key add` | `repositories.deploy-key-add` | repositories → Access & configuration |
| `repo deploy-key delete` | `repositories.deploy-key-delete` | repositories → Access & configuration |
| `repo deploy-key list` | `repositories.deploy-key-list` | repositories → Access & configuration |
| `repo edit` | `repositories.configure` | repositories → Repository settings |
| `repo fork` | `repositories.fork-with-options` | repositories → Create or fork |
| `repo gitignore list` | `repositories.gitignore-list` | repositories → Files |
| `repo gitignore view` | `repositories.gitignore-view` | repositories → Files |
| `repo license list` | `repositories.license-list` | repositories → Files |
| `repo license view` | `repositories.license-view` | repositories → Files |
| `repo read-dir` | `repositories.read-directory` | repositories → Files |
| `repo read-file` | `repositories.read-file` | repositories → Files |
| `repo rename` | `repositories.rename` | repositories → Repository settings |
| `repo set-default` | `repositories.default-context` | repositories → Tool environment |
| `repo unarchive` | `repositories.unarchive` | repositories → Repository settings |
| `skill install` | `repositories.skill-install` | repositories → Agents & skills |
| `skill list` | `repositories.skill-list` | repositories → Agents & skills |
| `skill preview` | `repositories.skill-preview` | repositories → Agents & skills |
| `skill publish` | `repositories.skill-publish` | repositories → Agents & skills |
| `skill search` | `repositories.skill-search` | repositories → Agents & skills |
| `skill update` | `repositories.skill-update` | repositories → Agents & skills |
| `cache delete` | `actions.cache-delete` | actions → Caches |
| `cache list` | `actions.cache-list` | actions → Caches |
| `run watch` | `actions.watch` | actions → Run progress (selected run) |
| `workflow run` | `actions.dispatch-with-options` | actions → Workflow inputs (selected workflow) |
| `agent-task create` | `repositories.agent-create` | repositories → Agents & skills |
| `agent-task list` | `repositories.agent-list` | repositories → Agents & skills |
| `agent-task view` | `repositories.agent-view` | repositories → Agents & skills |
| `attestation download` | `security.attestation-download` | repository-security → Attestations |
| `attestation trusted-root` | `security.attestation-trusted-root` | repository-security → Attestations |
| `attestation verify` | `security.attestation-verify` | repository-security → Attestations |
| `config clear-cache` | `repositories.clear-cli-cache` | repositories → Tool environment |
| `gpg-key add` | `organizations.gpg-key-add` | organizations → Account GPG keys |
| `gpg-key delete` | `organizations.gpg-key-delete` | organizations → Account GPG keys |
| `gpg-key list` | `organizations.gpg-key-list` | organizations → Account GPG keys |
| `label clone` | `repositories.label-clone` | repositories → Labels |
| `label create` | `repositories.label-create` | repositories → Labels |
| `label delete` | `repositories.label-delete` | repositories → Labels |
| `label edit` | `repositories.label-edit` | repositories → Labels |
| `label list` | `repositories.label-list` | repositories → Labels |
| `licenses` | `repositories.license-notices` | repositories → Tool environment |
| `ruleset check` | `security.ruleset-check` | repository-security → Rulesets |
| `ruleset list` | `security.ruleset-list` | repository-security → Rulesets |
| `ruleset view` | `security.ruleset-view` | repository-security → Rulesets |
| `secret delete` | `repositories.secret-delete` | repositories → Access & configuration |
| `secret list` | `repositories.secret-list` | repositories → Access & configuration |
| `secret set` | `repositories.secret-set` | repositories → Access & configuration |
| `ssh-key add` | `organizations.ssh-key-add` | organizations → Account SSH keys |
| `ssh-key delete` | `organizations.ssh-key-delete` | organizations → Account SSH keys |
| `ssh-key list` | `organizations.ssh-key-list` | organizations → Account SSH keys |
| `status` | `repositories.account-status` | repositories → Tool environment |
| `variable delete` | `repositories.variable-delete` | repositories → Access & configuration |
| `variable get` | `repositories.variable-get` | repositories → Access & configuration |
| `variable list` | `repositories.variable-list` | repositories → Access & configuration |
| `variable set` | `repositories.variable-set` | repositories → Access & configuration |

### Other leaves (93)

Accounts use AuthService; domain actions use GitHubService; local alias/extension actions use CliWorkflowsService; configuration uses CliConfigService; the schema explorer uses createApiService. The named surface must be mounted by app.ts, and its control must construct the described request. An unmounted mg-cli-workflows definition does not satisfy that requirement.

| CLI leaf | Class | Actual control or native path | Partial/missing behavior |
| --- | --- | --- | --- |
| `auth login` | R | Accounts → Sign in; AuthService | Browser/device login with scope choices. No token-file/stdin login, insecure-storage switch, git-protocol or skip-SSH-key controls. |
| `auth logout` | R | Accounts → reviewed Logout | One selected account/host; environment credentials remain externally managed. |
| `auth refresh` | R | Accounts → reviewed permission refresh | Add/remove/reset scope choices; clipboard/insecure-storage CLI flags lack equivalent per-operation controls. |
| `auth setup-git` | R | Accounts → reviewed Set up Git | Selected account/host; force override is not an exposed field. |
| `auth status` | R | Accounts → Refresh | Sanitized account records; token display and jq/template output are deliberately absent. |
| `auth switch` | R | Accounts → reviewed Switch | Explicit account/host; environment-active accounts block switching rather than pretending it worked. |
| `auth token` | R | Accounts → reviewed Copy credential | Clipboard-consent flow; no ordinary token display, export or CLI stdout parity. |
| `browse` | R | Selected domain record → Open in browser | Validated record URL only; no branch/path/blame/commit/wiki/settings URL builder or no-browser URL preview. |
| `codespace code` | B | CliWorkflowsService only; mg-cli-workflows unmounted | External VS Code/Insiders or browser adapter exists; component is unmounted and launcher/platform availability is unverified. |
| `codespace cp` | B | CliWorkflowsService only; mg-cli-workflows unmounted | Reviewed upload/download, recursive/profile/expansion adapter exists; no reachable selected-workspace copy editor. |
| `codespace create` | R | Cloud workspaces → New cloud workspace; codespaces.create | Repository, branch and display name only. Missing machine/location/devcontainer/idle-timeout/retention/default-permissions/status choices. |
| `codespace delete` | R | Selected cloud workspace → reviewed Delete | Single selection; no all/days/org/user batch selection or native force flag control. |
| `codespace jupyter` | B | CliWorkflowsService only; mg-cli-workflows unmounted | External remote Jupyter launcher adapter exists; no mounted control or installed-service proof. |
| `codespace list` | R | Cloud workspaces → paged list; codespaces.list | Active-user REST collection. No org/user/repository context selectors, JSON/jq/template/CLI limit controls; text search filters a page. |
| `codespace ports forward` | B | CliWorkflowsService only; mg-cli-workflows unmounted | Bounded mappings adapter exists; no mounted start/stop forwarding flow; all-interfaces is not accepted. |
| `codespace ports visibility` | B | CliWorkflowsService only; mg-cli-workflows unmounted | Bounded public/private/org mappings adapter exists; no mounted visibility editor. |
| `codespace ssh` | B | CliWorkflowsService only; mg-cli-workflows unmounted | SSH-config export/fixed diagnostics adapter exists; no mounted flow; arbitrary terminal/SSH arguments and PTY are unavailable. |
| `codespace stop` | R | Selected cloud workspace → reviewed Stop | Single selected name; no org/user/repository-owner filter controls. |
| `codespace view` | R | Selected cloud workspace → Overview/Ports | Fixed typed read/detail; no CLI result-field/jq/template controls. |
| `discussion create` | R | Discussions → New discussion; discussions.create | Title/category/body; no label/body-file controls. |
| `discussion list` | R | Discussions → paged list; discussions.list | GraphQL cursor list, page-local text filter. Missing answered/category/author/label/order/sort/state/limit controls. |
| `discussion comment` | R | Selected discussion → reviewed Reply | Creates a body-only reply; no existing-comment edit/delete or body-file selector. |
| `discussion view` | R | Selected discussion → Conversation/Answers | Fixed GraphQL selection; comments are paged. No CLI order/limit/result-field/template options. |
| `gist clone` | G | Source Control offers independent native Git clone; no selected-gist handoff | No reachable contextual gh gist clone workflow, destination/preflight binding or CLI clone argument forwarding. |
| `gist create` | R | Gists → New gist; gists.create | One filename/content/description/visibility; multiple selected files/stdin/editor/browser semantics are not covered. |
| `gist delete` | R | Selected gist → reviewed Delete | Exact selected ID; CLI yes becomes the native review rather than a free bypass. |
| `gist edit` | R | Selected gist → Edit; gists.edit | GUI edits description only. Native adapter accepts filename/content, but add/remove/rewrite file controls are missing. |
| `gist list` | R | Gists → paged list; gists.list | Authenticated collection, page-local text filtering. No public/secret/include-content/filter/CLI limit selectors. |
| `issue list` | R | Issues → paged list/state/search; issues.list | Search qualifiers can express some filters; no dedicated app/assignee/author/label/mention/milestone/type/limit selectors or CLI output controls. |
| `issue close` | R | Selected issue → reviewed Close; issues.close | No reason/comment/duplicate-of controls. Native reason field exists, but duplicate-of is not in the legacy schema. |
| `issue comment` | R | Selected issue → reviewed Comment; issues.comment | Body only; attachments, body-file, edit/delete-last and create-if-none require dedicated controls and backend behavior. |
| `issue develop` | G | Source Control has independent branch/worktree tasks | No issue-linked branch picker/create/link/list workflow, branch-repository choice or reviewed checkout/worktree handoff. |
| `issue reopen` | R | Selected issue → reviewed Reopen; issues.reopen | No accompanying comment option. |
| `issue view` | R | Selected issue → Conversation/Labels/Assignees | Fixed provider fields and comments; CLI JSON/jq/template selections are not exposed here. |
| `org list` | R | Organizations → paged list; organizations.list | Active-user membership collection; no CLI count limit or alternate owner context. |
| `pr list` | R | Pull requests → paged list/state/search; pulls.list | No dedicated app/assignee/author/base/head/draft/label/limit selectors; advanced qualifiers remain text. |
| `pr checkout` | G | Source Control has independent checkout/worktree tasks | No selected-PR local repository/head binding, branch/detach/force/submodule/worktree controls or gh checkout adapter in the domain GUI. |
| `pr close` | R | Selected pull request → reviewed Close; pulls.close | No accompanying comment or delete-head-branch option. |
| `pr comment` | R | Selected pull request → reviewed Comment; pulls.comment | Body only; file/attachment and existing-comment edit/delete controls missing. |
| `pr reopen` | R | Selected pull request → reviewed Reopen; pulls.reopen | No accompanying comment option. |
| `pr revert` | G | Source Control has independent local Git revert | No selected-PR revert-PR creation flow with title/body/draft and repository/head review; local commit revert is a different outcome. |
| `pr review` | R | Selected pull request → reviewed Review; pulls.review | Decision COMMENT/APPROVE/REQUEST_CHANGES and body; no body-file control or line/range review composer. |
| `pr view` | R | Selected pull request → Conversation/Files/Checks/Reviews/Commits | Fixed provider detail pages; CLI JSON/jq/template fields absent. |
| `project create` | R | Projects → New project; projects.create | Title/owner; no output formatting; API permission/owner availability remains provider-authoritative. |
| `project delete` | R | Selected project → reviewed Delete; projects.delete | Exact GraphQL node; no CLI result formatting. |
| `project edit` | R | Selected project → Edit; projects.edit | Title/description controls only; native readme/public/closed fields lack equivalent controls in this editor. |
| `project list` | R | Projects → paged list; projects.list | Owner derived from account, cursor paging, page-local filter. No closed/owner/limit GUI selectors in the list toolbar. |
| `project view` | R | Selected project → Items/Fields/Overview | Fixed GraphQL fields; project helper areas add specific item/field tasks, not every CLI result format. |
| `release list` | R | Releases → paged list; releases.list | No exclude-drafts/exclude-pre-releases/order/limit selectors; text filters only this page and local sorting does not order all server pages. |
| `release delete` | R | Selected release → reviewed Delete; releases.delete | No cleanup-tag option or separate reviewed tag deletion follow-up. |
| `release download` | R | Selected release → Assets → Download; releases.download-assets | Real reviewed legacy gh download, selected name and approved workspace directory, skip-existing fixed. No archive/clobber/output options or mounted streaming queue. |
| `release edit` | R | Selected release → Edit; releases.edit | Title/notes only; native draft/prerelease fields are not GUI controls. CLI latest/discussion-category/tag/target/verify-tag/notes-file remain outside this editor. |
| `release upload` | R | Selected release → Upload assets; releases.upload | Native file selection inside approved workspace; no overwrite/clobber toggle. |
| `release view` | R | Selected release → Release notes/Assets | Real fixed detail/assets pages; no CLI output field/template selectors. |
| `repo list` | R | Repositories → paged list/search; repositories.list | Membership collection/search. Missing dedicated owner/archived/fork/language/topic/visibility/count selectors; query text is not a typed filter panel. |
| `repo clone` | G | Source Control → native clone; create/fork helper offers reviewed cloning follow-up | Existing selected-repository Clone action is absent; gh no-upstream/upstream-remote-name and Git clone flag equivalence needs explicit handoff proof. |
| `repo delete` | R | Selected repository → reviewed Delete; repositories.delete | Exact repository review; no terminal confirmation bypass. |
| `repo sync` | G | Source Control offers local fetch/pull/push tasks | No selected-fork upstream synchronization adapter/control with source/branch/force and divergent-branch review; local pull is not fork sync. |
| `repo view` | R | Selected repository → Overview/Branches/Collaborators | Fixed detail tabs; no selected-branch README/file view or CLI result field/template controls in this legacy view. |
| `run cancel` | R | Selected run → reviewed Cancel; actions.cancel | No force option. |
| `run delete` | B | GitHubService actions.delete only | No selected-run Delete control in legacy actions or contextual helper areas. |
| `run download` | R | Selected run → Artifacts → Download; actions.download-artifacts | Real reviewed legacy gh download, selected name and approved workspace directory. Missing pattern control and mounted streaming progress/recovery flow. |
| `run list` | R | Actions → Runs, state and branch search; actions.list | Missing all/commit/created/event/user/workflow/limit selectors; no CLI jq/template fields. |
| `run rerun` | R | Selected run → reviewed Re-run; actions.rerun | Failed-only toggle exists; debug/job/attempt selectors missing. |
| `run view` | R | Selected run → Jobs/Logs/Artifacts | Real fixed pages and bounded logs. Missing selected attempt/job/log-failed/exit-status/verbose controls. |
| `workflow disable` | R | Selected workflow → reviewed Disable; actions.disable-workflow | Exact workflow ID; host-context limitation applies. |
| `workflow enable` | R | Selected workflow → reviewed Enable; actions.enable-workflow | Exact workflow ID; host-context limitation applies. |
| `workflow list` | R | Actions → Workflows; actions.list with workflows tab | Fixed paged workflow list; no all/CLI limit/result-field controls. |
| `workflow view` | R | Selected workflow → Workflows detail | Metadata only; no ref-specific YAML viewer. |
| `alias delete` | R | Aliases → selected row Remove; CliWorkflowsService | Single alias only; backend all flag is not exposed. |
| `alias import` | R | Aliases → Import; CliWorkflowsService | Native picker, hash-bound file copy and clobber control. Imported shell aliases are external code; no guided shell editor or arbitrary extension semantics proof. |
| `alias list` | R | Aliases → paged local list; CliWorkflowsService choices | Real installed local aliases; search filters loaded entries. |
| `alias set` | R | Aliases → New alias; CliWorkflowsService | Only six fixed builtin targets in GUI; empty argument list has no add/edit control. Missing clobber and shell-alias editing. |
| `api` | R | API explorer → typed REST/GraphQL forms; createApiService | Executable schema-constrained requests, not raw gh api parity; automatic paginate/slurp/jq/template/arbitrary input/headers remain different contracts. |
| `completion` | U | No desktop workflow | Shell completion scripts target external shells; no export/install control, and this is not a domain GUI action. |
| `config get` | R | Git configuration utility → actual setting values; CliConfigService | Allowlisted nonsecret keys; only Global/github.com scopes, not every approved Enterprise host. |
| `config list` | R | Git configuration utility → Settings/Environment/Help; CliConfigService | 14 key definitions and environment-presence reference; no arbitrary config/credential file editor or environment writes. |
| `config set` | R | Git configuration utility → reviewed setting changes; CliConfigService | api_host/http_unix_socket unavailable; external helpers native-picked, restricted globals; Restore default writes a value rather than unsetting inheritance. |
| `copilot` | B | CliWorkflowsService only; mg-cli-workflows unmounted | Detects installed standalone CLI and offers help/version or prompt denying all tools. No mounted Copilot destination, remove control or interactive/agent-tool parity. |
| `extension browse` | R | Extensions → Discover; CliWorkflowsService choices | Repository search replaces interactive browse; no debug/single-column terminal behavior or extension README/resource detail view. |
| `extension create` | R | Extensions → Create; CliWorkflowsService | Script/Go/other template and chosen folder. External build dependencies and OS compatibility remain unverified. |
| `extension exec` | R | Installed extension row → Run; CliWorkflowsService | Explicit separate arguments exist; no PTY/stdin, option discovery, per-extension typed schema or arbitrary plugin behavior proof. |
| `extension install` | R | Extensions → Install; CliWorkflowsService | Repository/pin fields; backend force/local-folder paths are not exposed by this editor. |
| `extension list` | R | Extensions → Installed; CliWorkflowsService choices | Real native list with local paging/filtering. |
| `extension remove` | R | Installed extension row → reviewed Remove; CliWorkflowsService | Exact selected installed name; publisher lifecycle/platform effects still external. |
| `extension search` | R | Extensions → Discover; CliWorkflowsService choices | Actual REST repository-search pages; query only. No typed owner/license/sort/order/CLI limit/format controls. |
| `extension upgrade` | R | Installed extension row → Update; CliWorkflowsService | Single extension; all/dry-run/force fixed false with no exposed toggle. |
| `preview prompter` | U | Backend explicitly rejects native preview; component unmounted | Native interaction requires PTY. Generic app confirmation dialogs do not prove gh preview behavior. |
| `search code` | R | Search GitHub → Code; search.list | Typed result destination plus query qualifiers/paging; command-specific filters/sort/order/limit and CLI output fields are not individual controls. Search PRs adds is:pr. |
| `search commits` | R | Search GitHub → Commits; search.list | Typed result destination plus query qualifiers/paging; command-specific filters/sort/order/limit and CLI output fields are not individual controls. Search PRs adds is:pr. |
| `search issues` | R | Search GitHub → Issues; search.list | Typed result destination plus query qualifiers/paging; command-specific filters/sort/order/limit and CLI output fields are not individual controls. Search PRs adds is:pr. |
| `search prs` | R | Search GitHub → Pull requests; search.list | Typed result destination plus query qualifiers/paging; command-specific filters/sort/order/limit and CLI output fields are not individual controls. Search PRs adds is:pr. |
| `search repos` | R | Search GitHub → Repositories; search.list | Typed result destination plus query qualifiers/paging; command-specific filters/sort/order/limit and CLI output fields are not individual controls. Search PRs adds is:pr. |

### Authentication transport and public-key follow-up

The newer Accounts implementation adds actual HTTPS/SSH sign-in transport choices, default-skipped SSH setup, a separate reviewed native-selected public-key upload, and exact approved-host Git helper setup before sign-in. The force option follows the pinned CLI's unauthenticated-host semantics; it is not an additional helper overwrite mode. Native receipts bind file bytes and effective account ID, with immediate stored-action authorization and one-use cancellation-safe cleanup. Compiled controls exercise these service paths, and an actual pinned CLI fixture verifies the host-only helper in isolated configuration. See [authentication workflows](authentication-workflows.md). Token-file secure registration remains pending; CLI plaintext fallback, actual provider permissions, local private Git credentials and platform vault availability remain explicit limits. Historical audit counts and full-option parity claims are unchanged.
