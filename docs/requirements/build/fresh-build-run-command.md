# One fresh Microsoft Windows build-and-run command

Public feature identifier: `fresh-build-run-command`. Category: **build**.

## Required behavior

Every README that documents a Microsoft Windows build shows one copy-and-paste command, conventionally `.\build.bat --run`, that works on a completely fresh Microsoft Windows installation, acquires and verifies every dependency or prerequisite from pinned canonical sources, builds the real runnable artifact, verifies it against the current source commit, and launches it only after success. `build.bat`, `download-dependencies.bat`, and the package path share one committed build manifest, and the launch decision binds to a receipt for the unchanged source. dependency or prerequisite activation is staged, locked, journaled, and recoverable after an interrupted or malformed run.

## Current support and configuration

README documents build.bat --run. Source-bound manifest/receipt and interrupted bootstrap need clean Windows proof.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Drive fresh installation, unchanged-source launch receipt, staged/locked/journaled dependency activation and failure recovery.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](fresh-build-run-command.yue.md).
