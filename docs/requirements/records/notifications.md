# Non-blocking notifications and their centre

Public feature identifier: `notifications`. Category: **records**.

## Required behavior

Informational, success, progress, and non-decision issue messages appear as non-blocking toasts anchored in a bottom corner, auto-dismissing except bugs or failures and warnings, stacking without overlap, and carrying optional actions, while modal dialogs are reserved for real decisions. A notification centre or history keeps dismissed notifications reviewable, searchable, and bulk-manageable. Every notification is localized, focusable, announced, contrast-safe, and dismissible through an adequate target.

## Current support and configuration

Durable bounded notification state/actions and reviewed history exports exist. Complete final-shell event integration is still unverified.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../workspace.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Notification records have `info`, `success`, `warning` or `error` kind, timestamp, title, read/dismissed state and optional operation ID. Titles are bounded to `240` characters and the collection to `500` records. Durable native history is separate from the shell's temporary toast timer.

## Failures and remaining work

Drive warning persistence/toast stacking/actions, focus/announcements, dismiss/restart/search and scoped bulk operations.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](notifications.yue.md).
