# Material Git development

Build a productive Windows desktop with genuine registered Material Design 3 controls. The app opens live task workspaces, not a command catalog, generic command form or marketing layout. Keep the documentation site separate from the runtime.

## Agent conversation vocabulary

Agents working in this repository use the shared private conversation vocabulary defined in
the maintainer's canonical agent instructions for every reply, including chat prose, visible
reasoning, status lines, and task or session titles. Read those instructions and apply them
in full. They are deliberately not restated here, because this file is part of this
repository's public record.

That vocabulary never appears in anything published. Keep it out of commit messages, branch
names, code, code comments, test names, documentation, this file, issues, pull requests,
discussions, release notes, published sites, logs, and every other file in this repository.
Published writing uses ordinary professional English, and exact technical identifiers always
keep their literal spelling. The single documented public-safe exception is named in those
canonical instructions; do not infer any other.

Scan any text bound for a public surface against that vocabulary before publishing it. A
reviewer cannot tell a correct release note from a leaking one by reading it, so the scan is
a step, not a habit.

## Sanitized project instruction summary

The [canonical-helper-exported summary](docs/requirements/shared-instructions.md) describes project-specific operating rules. It is explicitly a summary: full-source export currently fails the canonical public guard, and a complete mirror remains open.

Use typed validated IPC, argument arrays and bounded subprocess/network results. Repository-controlled hooks, aliases, filters, credential helpers, diff tools and transport programs still need execution trust. Keep secrets and personal vocabulary out of ordinary history/export/log/capture records. Sensitive records use dedicated native encryption/credential services.

Every search owns independent state and an adjacent regex builder. Entity/enumerated values have genuine choices. Review destructive effects exactly, invalidate stale receipts, preserve unsaved work and report partial outcomes. Provide keyboard/touch access, real default/source explanations and genuine unavailable states.

## Verification and records

Run type checks, meaningful affected tests, action-inventory checks and `node scripts/check-feature-coverage.mjs` locally. Ordinary inventory validation reports incomplete functionality honestly. `--require-complete` fails until all applicable features have implementation, documentation/localization, persistence, regression, built-interaction and screenshot proof.

Capture the final app with isolated profiles and source/artifact provenance. Mocks and source checks do not establish live API permission or Windows installer/secure-storage behavior. Refresh README, articles, ROADMAP, HANDOFF and CLOSEOUT_PROMPT in relevant tasks; do not silently remove unfinished scope.

Windows CI builds/packages/publishes through root entrypoints and does not run tests/lint. Artifacts are unsigned Squirrel packages. Remote metadata, Discussions, Project state, wiki/site publication, releases and remote refs belong to the authorized publishing owner. Do not invent remote success.
