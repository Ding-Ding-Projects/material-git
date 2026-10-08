# GitHub CLI and API action audit

This is an independent, read-only capability audit. A CLI help entry or schema record proves that an upstream action exists; it does not prove that Material Git exposes a working GUI workflow or that a request succeeds with the current account. [The action map](github-action-map.json) records every built-in leaf and flag, REST operation, GraphQL root field, configuration key, environment setting, global flag and help topic separately.

The desktop is being rebuilt around live repositories, issues, pull requests, Actions, releases, projects, discussions, organizations, gists and cloud workspaces. Command catalogs and generic command forms are not accepted as replacements for those workflows. Candidate domain actions below are source-reviewed and still need integration and built-interface evidence. Existing advanced schema forms remain distinct from a contextual domain workflow.

## Official versions and source comparison

The public GitHub release API reports **GitHub CLI 2.102.0** as the latest version, published **2026-09-30T02:40:02Z**, at commit `fc4b137cdef0a6bd28fd461b7cf9c84a5812a8cd`. The bundled version matches. Research uses only its local `help` commands in an empty temporary configuration, with authentication-related environment variables removed; it never invokes account token output or remote mutations.

The latest REST-description file is at commit `355db395991cb7e421fae2cc720189ad86558cbe`; its SHA-256 is `ba5ddc1eeeede9f3858abd96325359891f38a2bd8e20fd111abf4230741db194`, exactly matching the pinned source at `2eba8c3ba02f022011539cf01efc43e0251502f8`. Both contain **1,232 operations**. The latest GraphQL documentation schema is at commit `b93d24a586415cb392f05738d2092cf4887510c5`; SHA-256 `4b11889444f390414dbce052da9f09771e0eb155c1981e2d22c012d73cdfe768` exactly matches the pinned source at `7b807926df3ccb7f3d1bcd4ad1c652fb42b0931d`. Both contain **1,829 non-introspection types**, with no field/type signature change. Different repository commits do not imply schema drift when their file bytes are identical.

The map contains exact checked time, upstream URLs, hashes and comparison results. Sources: [CLI release](https://github.com/cli/cli/releases/tag/v2.102.0), [official manual](https://cli.github.com/manual/), [REST source](https://github.com/github/rest-api-description), [GraphQL source](https://github.com/github/docs/tree/main/src/graphql/data/fpt), and the committed source metadata in `data/github-api-catalog.json`. A future upstream refresh must repeat the comparison rather than carry these conclusions forward.

## Highest-priority gaps

| Workflow | Available source behavior | Remaining capability or evidence |
| --- | --- | --- |
| Issues | List/details; create, edit, comment, close and reopen; labels/assignees/milestone fields in candidate native actions | Type, parent, blocking/blocked-by links, Projects membership and attachments are not equivalent domain actions yet. Template/body-file/recover/browser flags need an explicit mapped GUI path. |
| Pull requests | List/details and conversation/files/checks/reviews/commits; create/edit/comment/close/reopen/merge/review in candidate services | Confirm reviewer requests and branch deletion in the final integrated UI. Creation metadata, attachments, fill modes, dry run, maintenance permission and recovery remain separate from a basic title/body/base/head form. Local checkout/diff/revert is a file/Git workflow, not a REST edit. |
| Actions | Runs/jobs/artifacts/workflows reads; cancel, rerun, failed-only rerun and deletion in candidate actions | Workflow dispatch, enable/disable, cache management, artifact downloads and ZIP logs require real action/download controls. The native JSON detail adapter explicitly refuses run-log ZIPs. A visible Logs tab without a download handoff is incomplete. |
| Releases | List/details/assets and reviewed create/edit/delete/upload | Asset download/delete/rename, generated notes, verification, clobber and platform-specific file selection need individual UI mappings and proof. Upload approval and workspace bounds do not prove remote success. |
| Projects | GraphQL list/details/create/edit/delete/add existing issue or PR | Fields and item-value editing/clearing, draft items, item deletion/archive/copy, linking/unlinking repositories and template/copy operations need contextual board/field controls. A generic GraphQL mutation picker is not board integration. |
| Repositories | List/details/branches/collaborators and create/edit/delete/fork | Clone/sync/local checkout, deploy keys, licenses/gitignore/templates, rule sets and specialized permission flags require dedicated workflows. A browser link is not a local clone. |
| Cloud workspaces | REST list/detail/create/start/stop/delete plus reviewed CLI connection/copy/port helpers | Machine/region/retention/devcontainer/network choices and bulk owner/repository contexts remain to be mapped. A Ports detail JSON adapter cannot manufacture a REST port-list endpoint; route to the real CLI forwarding/visibility controls. |
| Other CLI families | Native structured dispatch knows many command leaves | Variables, secrets, SSH/GPG keys, attestations, agent tasks and skills need actual contextual GUI workflows or explicit unavailable states. Registry counts must not imply integration. |

These findings were sent directly to the domain renderer and native workflow owners while implementation was active. The map labels their working-source actions as candidates; it must be refreshed after their commits integrate.

## Flags and cross-cutting API behavior

| Official capability | Adapter/GUI distinction |
| --- | --- |
| `gh api --paginate` | Schema REST supports explicit next-page links and GraphQL has guided connection cursors. Neither is an automatic unbounded all-pages collection mode. |
| `--slurp` | An enclosing array of all pages is not a field in the dedicated request contract. A structured JSON export of one result is not equivalent. |
| `--jq`, `--template`, `--format`, JSON fields | Generic dispatch recognizes many output flags. The dedicated API request schema does not accept arbitrary jq/Go-template programs. Distinguish selected schema fields, supported export formats and actual transform controls. |
| `--input`, `--field`, `--raw-field` | The schema adapter validates declared typed bodies. Native body-file handles support declared `application/octet-stream` inputs up to 64 MiB. Arbitrary stdin, undeclared media types, automatic file-reading field expressions and full CLI coercion are different capabilities. |
| Binary responses | The native adapter can hand bounded binary bytes to an approved export callback. It retains a 4 MiB response cap; large archives need a streaming download workflow rather than pretending JSON export covers them. |
| `--hostname` and server context | Only approved host records may choose REST, GraphQL and release-upload origins. Public GitHub.com schemas do not guarantee GitHub Enterprise Server version/feature compatibility. CLI configuration `api_host` and Unix sockets remain unavailable connection-adapter cases. |
| `--cache` | The schema adapter exposes reviewed read-only durations 0, 60, 300 and 3,600 seconds. Arbitrary native duration syntax is not equivalent. |
| `--preview`, headers, `--include`, `--silent`, `--verbose`, escape sequences | Standard response headers and declared/allowlisted request headers are available. Not every preview media type, terminal-printing mode or escape-sequence option has a dedicated control. Authentication headers stay managed. |
| GraphQL documents | Typed selections, aliases, nested fields, fragments and validated inputs differ from arbitrary documents, named reusable fragments, directives, variables and scripts. Bounds are depth 16 and 500 selected fields; output limits and permission errors remain explicit. |
| Local command context | Repository, working folder, host, owner and account are separate choices. Command flags must map to their real context; a global repository picker cannot satisfy an owner/organization/profile selector. |

## Extensions, SSH, aliases and Copilot

Extension install can select an `OWNER/gh-extension` or approved local folder, optional pin and force; creation offers script/Go/other templates; upgrade supports one/all, dry run and force. Execution forwards bounded separate arguments to a currently installed extension and never provides terminal stdin. Installed extensions are dynamic publisher programs with their own flags and dependencies: the 196 built-in commands do not enumerate them. Source build requirements, platforms, conflicting command names, interactive extensions and release/precompiled layouts need their own reviewed results.

The Codespaces SSH adapter offers SSH-config export or fixed diagnostic profiles. Those diagnostic names are not equivalent to the official `--profile` setting. Arbitrary SSH arguments, `--server-port`, debug/debug-file, SSH key handling and a real interactive terminal/PTY are separate capabilities. Copy supports approved local paths, direction and recursion; remote shell expansion and profile/owner/repository selectors require explicit reviewed behavior. Editor/Jupyter actions launch installed/configured external programs and must report missing launcher or remote Jupyter service honestly.

Alias import preserves the reviewed YAML file behind size/hash checks and warns about imported shell aliases. The guided editor creates a normal built-in alias; arbitrary shell-alias editing/execution is not thereby supported. Positional interpolation, clobber, multiline YAML and names conflicting with built-ins need their actual behavior described and exercised.

Copilot detection checks the installed official executable. Guided help/version and noninteractive prompt profiles do not establish arbitrary Copilot capabilities, authorization/tool policies, interactive sessions, extension delegation, or `gh copilot --remove`. Missing installation is a platform/service dependency, not an empty successful result. No executable is downloaded implicitly in the reviewed adapter.

## Configuration, environment and evidence boundaries

The official help documents **14 configuration keys**, **34 environment-variable names**, two root flags and eight help topics. Configuration changes use native scoped reads and reviewed writes. Editor/browser/pager choose an executable without arbitrary shell arguments. `api_host` and `http_unix_socket` require connection adapters. Clipboard and telemetry have global-scope restrictions. Writing a default value does not remove an override: there is no native unset/reset command. Environment references expose names/presence only and never credentials or values; changing a user's environment is not implemented by that read-only reference.

Remote reads require relevant visibility; GraphQL requires authentication; writes/admin actions need account, organization, repository, token and possibly enterprise policy permissions. HTTP 403 is a permission result, not evidence that a button is wired incorrectly or that all same-category actions fail. Browser login, enterprise contexts, OS credential storage, external tools and installed Windows behavior need distinct live proof.

The map's evidence values deliberately remain source/help/schema audit or candidate status unless a specific built interaction is recorded. Previous read-only `GET /meta` and GraphQL `viewer { login }` results prove those requests at their captured revision; they do not prove all endpoints, current domain integration or remote mutations. Negative map checks reject missing leaves, flags, configuration rows and API operations; passing those checks proves inventory integrity, not full functional parity.

[Requirements and evidence](../requirements/README.md) · [API coverage](../api-coverage.md) · [CLI workflows](../cli-workflows.md)
