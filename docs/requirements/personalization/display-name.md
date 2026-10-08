# Renaming the application

Public feature identifier: `display-name`. Category: **personalization**.

## Required behavior

The person using an application can change the name it shows them in the title bar, the About surface, notifications, and everywhere else it introduces itself, persisted and resettable to the shipped name in one action. Renaming changes the display name and nothing else: the data directory, installer and package ids, update feed, and markers written into other repositories stay derived from a constant, and diagnostics and crash reports still send the shipped name. Every rename, change, and reset records its own append-only commit in the application's local history.

## Current support and configuration

Display name is a persisted presentation value and constant product identity remains separate.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: not-applicable; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify title/About/notifications together, reset and one append-only sanitized revision per mutation.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](display-name.yue.md).
