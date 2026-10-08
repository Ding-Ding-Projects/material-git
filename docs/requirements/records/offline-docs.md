# Offline documentation browser in every application

Public feature identifier: `offline-docs`. Category: **records**.

## Required behavior

Every GUI application bundles every feature article at build time into a full offline documentation browser rendered by its one shared Markdown renderer, distinct from and additional to the GitHub Pages articles. Article links resolve inside the application, the browser carries its own regex search across titles and bodies, and a completeness check fails the build when an article file in the repository is missing from the bundle.

## Current support and configuration

Eager article bundle/shared renderer has a red-then-green omission guard and isolated Electron article navigation evidence.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: not-applicable; repository: not-applicable**. See [implementation reference](../../workspace.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Build-time `import.meta.glob` eagerly includes every `docs/**/*.md` article. The shared sanitized Markdown renderer resolves known relative article links internally. The browser pages `10` index entries at a time and searches titles/bodies; the build omission guard decodes JavaScript and checks that each article path maps to its exact full source body. Missing, changed or swapped bodies fail the build.

## Failures and remaining work

Repeat final artifact drive after new articles; verify every article/body search, relative links and no network dependency.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](offline-docs.yue.md).
