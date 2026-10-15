# Material Git

A Windows desktop workspace for Git repositories and GitHub. Navigate repositories, changes, linked working trees, issues, pull requests, Actions and releases through contextual tasks. Current source adds independent repository tabs, reviewed repository completion batches, ignore rules, large-file payload management, and build/run/installer workflows.

Install the unsigned Windows application from [build-16-1](https://github.com/Ding-Ding-Projects/material-git/releases/tag/build-16-1). [Intended public documentation site](https://ding-ding-projects.github.io/material-git/) · [Feature status](docs/requirements/README.md) · [Roadmap](ROADMAP.md) · [Handoff](HANDOFF.md).

**Work is paused for preservation at the user’s request.** The user reports oversized and overlapping controls in the shown screenshots; the issue is open, with no verified fix. Full Git/GitHub action parity remains unverified. The inventory still records 104 requirements and 161 unresolved surface obligations. Source support, focused Linux evidence, integrated desktop acceptance and Windows installation are tracked separately. The published installer predates the current implementation. See the [current acceptance record](docs/local-verification.md#current-integration-acceptance) for the failed full-suite result, focused follow-ups and unfinished acceptance.

## Desktop interface

The current desktop uses official Material Web controls, locally bundled Material Symbols, tonal light/dark surfaces, searchable choice dialogs and a reusable color editor. Tabs keep grouping, pinning and docking; enlarged text preserves scroll access to the work area. [Component provenance](design/material-provenance.md) distinguishes official controls from application compositions.

Repository tabs keep their native repository identity and guarded drafts. Native repository selection or explicit reconnection establishes access; a saved path alone cannot grant it. Working-tree tools, completion, ignore rules and build tools operate on the selected repository context. The [verification record](docs/local-verification.md#current-integration-acceptance) separates focused native/Electron checks from the pending final integrated suite and capture matrix. Historical screenshots retain their original source receipts.

<details>
<summary>Tasks, support and limits</summary>

The desktop uses real lists/details, guided choices, typed native actions and mutation review. Advanced API forms, extensions, aliases, cloud workspaces and local Copilot have distinct integration tasks. Local tools include bounded regex evaluation, supported conversion adapters and an Ollama subset.

[Working-tree management](docs/repository-worktrees.md) inspects and operates on native-approved linked directories. [Repository completion](docs/articles/repository-completion.md) reviews exact branch contributions, commit messages, safe publication, integration, private recovery archives and eligible cleanup. Batches run at most three independent repositories, preserve shared-store exclusion, and report cancellation and partial outcomes. Existing default working trees and shared stashes are retained.

The [ignore builder](docs/ignore-builder.md) previews rules against actual paths before saving. [Cheap LFS workflows](docs/cheap-lfs.md) preserve reviewed pointers and payloads; they are distinct from standard Git LFS. Private cloud compression is unavailable; viewing external builder requirements does not provision or run a builder. [Build and installer management](docs/build-and-installers.md) discovers recipes across supported project types, reviews executable commands and expected outputs, records artifacts, and offers optional [Codex/OpenCode analysis or repair](docs/features/build-repair.md). Detection does not prove every language toolchain or installer platform. Authenticated storage-provider writes and model execution need separate evidence.

The [GitHub audit](docs/coverage/github-actions-audit.md), [Git audit](docs/coverage/git-actions-audit.md) and [104-feature inventory](docs/coverage/features.json) distinguish implementation gaps, dependencies, permissions and missing evidence. Universal history restore, export coverage, bulk actions, localization/appearance and platform verification remain open.

Credentials and personal vocabulary are excluded from ordinary exports/history. Git hooks, aliases, filters and external helpers require execution trust; argument arrays alone do not neutralize them. Remote actions depend on actual permissions. Linux checks do not establish Windows installation, secure storage or updates.

</details>

<details>
<summary>Build and development</summary>

Fresh Windows build-and-run entrypoint:

```powershell
.\build.bat --run
```

Root scripts acquire pinned prerequisites in user scope. `build-installer.bat /s` creates unsigned Squirrel artifacts and checksums. Clean Windows execution remains separately tracked.

Source development requires Node.js 22.20 or newer and desktop runtime libraries; Linux uses system Git.

```sh
npm ci
npm run fetch-dependencies
npm run check
npm test
npm run dev
```

`npm run build` bundles the app and offline articles. `node scripts/build-site.mjs` builds the separate documentation site. `node scripts/check-feature-coverage.mjs` validates inventory integrity and reports open obligations; `--require-complete` fails until proof is complete. See [build details](docs/build.md) and [contributing](CONTRIBUTING.md).

Windows CI builds/packages/publishes. It does not run tests or lint; notes must state actual local checks.

</details>

<details>
<summary>Documentation, evidence and site state</summary>

[Documentation index](docs/README.md) · [Authentication](docs/authentication.md) · [Security](docs/security.md) · [Workspace records](docs/workspace.md) · [API workspace](docs/api-explorer.md) · [Design provenance](design/material-provenance.md).

The [historical screenshot ledger](docs/images/README.md) preserves 21 genuine Linux desktop captures from source `e464ff7`, with exact per-image capture times, dimensions and SHA-256 hashes. That earlier gallery covers real domain records, provider empty states, export-format choices, verified native download completion, converter adapter limits and light/dark/Cantonese/bilingual/narrow presentation. These images describe their recorded source artifact, not the current control refresh or the separately published Windows installer. Settled native account and Download Start frames are included; superseded loading, empty-queue and transition frames remain excluded. Final destination coverage, recording and the full language/scale matrix remain open.

The intended public documentation address is https://ding-ding-projects.github.io/material-git/; deployment and About readback are pending. The older site remains owner-private with its audience unchanged. Its earlier About homepage PATCH returned HTTP 403. A prepared public-site checkpoint remains unmerged and undeployed; three bundled articles still require removal of the old private address before its privacy guard can pass.

</details>

<details>
<summary>Project instructions, counts and community</summary>

Follow the [sanitized project instruction summary](docs/requirements/shared-instructions.md): productive domain tasks, genuine Material controls, guided native operations, bounded execution, privacy, meaningful checks and factual evidence. It was exported through the canonical helper. Full instruction export currently fails the canonical public guard, so a complete mirror remains explicitly open. [AGENTS.md](AGENTS.md) carries the exact neutral discipline block without private terms.

Human effort estimate: **not calculated** until a verified workflow line-count report exists. The eventual estimate must state eligible handwritten lines, exclusions, assumed rate/multiplier and arithmetic. No manual/generated total substitutes for published evidence.

[License](LICENSE) · [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Closeout prompt](CLOSEOUT_PROMPT.md).

</details>
