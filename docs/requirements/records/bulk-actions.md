# Bulk actions everywhere

Public feature identifier: `bulk-actions`. Category: **records**.

## Required behavior

Every list, table, grid, and collection, the notification centre and every history panel included, supports multi-select with click, shift-click, and keyboard, an honestly scoped select-all for this page or every match, inverse selection, and the whole action set in bulk. Bulk runs show the exact count and a reviewable preview, report every skipped item and why, use blocking confirmation only for destructive batches, stay undoable through local history, and report progress and partial results honestly.

## Current support and configuration

Workspace records expose bounded selection/actions; new domain bulk operations are not universally verified.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../workspace.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Workspace selection supports individual/range selection and filtered actions. Group and pinned-tab protection participates in close previews. Native batches must state exact selected IDs and partial outcomes. Closing discarded drafts records safe metadata, not plaintext input restoration.

## Failures and remaining work

Prove page-versus-all-matches scope, shift/keyboard/inverse selection, exact count, skipped-item reasons and partial recovery.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](bulk-actions.yue.md).
