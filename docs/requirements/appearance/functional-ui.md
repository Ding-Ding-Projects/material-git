# Functional UI and truthful empty states

Public feature identifier: `functional-ui`. Category: **appearance**.

## Required behavior

Any icon, preview, toolbar control, card, tab, badge, or affordance presented as usable performs its labelled action, exposes an accessible equivalent, persists its state where applicable, and has an interaction gate, while anything purely illustrative is labelled a static preview and never styled as a live control. Releases are real applications, not demo shells: no fake default placeholders, seeded sample documents, or mock-only workflows, only truthful empty states with real create and open paths. Discarding unsaved work is recorded as an append-only local history action before the close completes.

## Current support and configuration

Native domain actions and real lists/details are integrated. The action map explicitly separates candidate actions from live verification.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../coverage/github-actions-audit.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Domain edits first call native `review`, retain a bounded expiry receipt, then call `apply` with that receipt. Changing a field invalidates review. The renderer blocks invalid forms, saving reentry, missing receipts and incomplete destructive confirmation; remote permission and partial effects remain native outcomes.

## Failures and remaining work

Drive every domain action through final UI; verify truthful empty/error states, no seeded entities and recorded draft discard.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](functional-ui.yue.md).
