# Material Git

A Windows desktop workspace for Git repositories and GitHub. Navigate real repositories, issues, pull requests, Actions, releases and related records through contextual tasks. Local Git support is being expanded around changes, history, branches and repository operations.

Install the unsigned Windows application from [build-15-1](https://github.com/Ding-Ding-Projects/material-git/releases/tag/build-15-1). [Documentation site](https://material-git.earlyray.chatgpt.site) · [Feature status](docs/requirements/README.md) · [Roadmap](ROADMAP.md) · [Handoff](HANDOFF.md).

**Full Git/GitHub action parity is not verified.** Upstream command and schema inventories do not prove working GUI behavior. The published release may precede changes documented in source. Current screenshots and recording for the domain remake await final build verification.

<details>
<summary>Tasks, support and limits</summary>

The desktop uses real lists/details, guided choices, typed native actions and mutation review. Advanced API forms, extensions, aliases, cloud workspaces and local Copilot have distinct integration tasks. Local tools include bounded regex evaluation, supported conversion adapters and an Ollama subset.

The [GitHub audit](docs/coverage/github-actions-audit.md), [Git audit](docs/coverage/git-actions-audit.md) and [104-feature inventory](docs/coverage/features.json) distinguish backend/UI gaps, dependencies, permissions and missing evidence. History restore, export formats, bulk actions, universal localization/appearance and final platform verification remain open.

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

The [reviewed screenshot ledger](docs/images/README.md) preserves nine genuine desktop captures from source `44dc9d8`, with exact capture times and SHA-256 hashes. They describe that earlier source, independently of the Windows release and newer implementation. Additional genuine export, download, appearance, language and startup-photo captures have been inspected; they remain outside the published gallery until a coherent capture receipt records each image’s source, timestamp and hash. Final destination coverage, recording and the full language/scale matrix remain open.

The site is https://material-git.earlyray.chatgpt.site and currently owner-private. Repository About homepage PATCH returned HTTP 403 with the connected credential; permission/deployment verification belong to the publishing owner. Source visibility and site audience are independent.

</details>

<details>
<summary>Project instructions, counts and community</summary>

Follow the [sanitized project instruction summary](docs/requirements/shared-instructions.md): productive domain tasks, genuine Material controls, guided native operations, bounded execution, privacy, meaningful checks and factual evidence. It was exported through the canonical helper. Full instruction export currently fails the canonical public guard, so a complete mirror remains explicitly open. [AGENTS.md](AGENTS.md) carries the exact neutral discipline block without private terms.

Human effort estimate: **not calculated** until a verified workflow line-count report exists. The eventual estimate must state eligible handwritten lines, exclusions, assumed rate/multiplier and arithmetic. No manual/generated total substitutes for published evidence.

[License](LICENSE) · [Contributing](CONTRIBUTING.md) · [Security reporting](SECURITY.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Closeout prompt](CLOSEOUT_PROMPT.md).

</details>
