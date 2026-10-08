# A context menu on every element

Public feature identifier: `context-menus`. Category: **navigation**.

## Required behavior

Every user-facing application and GitHub Pages, and every rendered element within it, provides a target-specific right-click context menu plus accessible keyboard and touch equivalents, including **Edit appearance…** and **Lock this element…**. Every context menu and every dropdown opens with a keyboard-focusable filter field and its own anchored regex builder, however short the menu, filtering locally without reordering meaning, hiding a destructive item while its shortcut stays live, or changing any action. Focus lands in the filter on open where the platform allows, arrows move, Enter activates, Escape clears and then closes, focus returns to the opener, and screen readers hear the result count.

## Current support and configuration

Tab context hooks and shared appearance/security menus exist. Universal per-element filtered menu coverage is unproven.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../workspace.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Inventory targets, keyboard/touch paths, adjacent regex builders, focus return and action consistency.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](context-menus.yue.md).
