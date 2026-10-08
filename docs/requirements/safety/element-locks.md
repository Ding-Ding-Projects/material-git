# Toy locks on every element

Public feature identifier: `element-locks`. Category: **safety**.

## Required behavior

Every rendered element, tab, tab group, and appearance value can be locked from its own **Lock this element…** command through a non-modal anchored wizard choosing exactly one of six credential mixes: PIN, password, PIN plus password, password plus TOTP, PIN plus TOTP, or password plus PIN plus TOTP. Each lock has its own credential set in the operating-system credential vault with no master credential or implicit inheritance, and a locked element is truly disabled yet opens its own anchored unlock prompt, with no shortcut, palette teleport, or automation hook walking around it. Every lock says it is just for fun, never security, and names deleting the local application-data folder as the recovery.

## Current support and configuration

Six per-target credential policies and native target registry/assertions are integrated; UI helper interception alone is not a security boundary.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../security.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Policies are `pin`, `password`, `pin-password`, `password-totp`, `pin-totp` and `password-pin-totp`. Unlock duration is this surface/action, the app session, or `1`–`1440` minutes. Native targets are registered by stable ID and mutations reassert locks; DOM interception alone is insufficient.

## Failures and remaining work

Verify all contextual/keyboard/palette/automation routes, independent credentials, expiry/session/one-action policies and vault failures.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](element-locks.yue.md).
