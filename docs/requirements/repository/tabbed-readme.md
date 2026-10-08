# A tabbed README, not a scroll

Public feature identifier: `tabbed-readme`. Category: **repository**.

## Required behavior

A README opens with a compact index, what the project is, the install line, the GitHub Pages link, and short contents, and folds every long reference section into `<details><summary>` blocks with findable summaries. `CONTRIBUTING.md`, `LICENSE`, `SECURITY.md`, and `CODE_OF_CONDUCT.md` stay real and current so GitHub shows them as tabs above the README. What a first-time reader needs is never collapsed.

## Current support and configuration

Compact introduction/install/site links and folded reference sections are being refreshed; community files are added.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../README.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify first-reader content remains visible and CONTRIBUTING/LICENSE/SECURITY/CODE_OF_CONDUCT are real current files.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](tabbed-readme.yue.md).
