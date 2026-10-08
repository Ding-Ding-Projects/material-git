# Context menus show working shortcuts

Public feature identifier: `menu-shortcuts`. Category: **navigation**.

## Required behavior

Every context-menu item that has a keyboard shortcut displays it right-aligned in the platform's own notation, derived from the same source that registers the binding so the two cannot drift. The displayed shortcut is the one that actually works in that context, reaches assistive technology as a shortcut announced once, and an item with no shortcut shows nothing.

## Current support and configuration

Palette shortcut is wired; a complete shared menu-shortcut registry audit is still required.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../workspace.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Display only working context bindings and derive labels from the binding source; verify assistive announcements.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](menu-shortcuts.yue.md).
