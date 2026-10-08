# committed screen recording

Public feature identifier: `screen-recording`. Category: **verification**.

## Required behavior

Every user-facing application ships a real recording of its built artifact at a known commit, driven through the project's headless route, committed to its own repository, and shown in the README. It records the application's own window or renderer on an off-screen desktop, never the machine's screen, and shows a real end-to-end path rather than a highlight reel. It stays small, routes a genuinely large file through the repository's own large-file path and never standard Git LFS, and is refreshed whenever the interface changes.

## Current support and configuration

A committed current end-to-end desktop recording is not verified by this audit.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: open; site: not-applicable; repository: partial**. See [implementation reference](../../local-verification.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Record only the actual app window/renderer at known build hash; keep small and refresh after interface changes.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](screen-recording.yue.md).
