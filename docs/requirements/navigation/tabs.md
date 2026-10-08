# Browser-style tabbed navigation

Public feature identifier: `tabs`. Category: **navigation**.

## Required behavior

Every user-facing application and GitHub Pages presents content as browser-style tabs whose strip docks to any edge, left by default, with axis-correct accessibility, an overflow surface, reordering, first-class pinning and grouping, decoratable groups, and persistence of order, pins, groups, and collapsed state across restarts. Settings, properties, and appearance surfaces are tabbed too, with the whole tab feature set, in addition to their own search. Every application ships the four tab-discovery searches, a **Move… into group…** picker instead of inline move lists, and the **Close tabs containing text** and **Close tabs not containing text** actions with previews, pinned exclusion, and regex builders.

## Current support and configuration

Reusable tab management has persistence/fixture tests and real isolated Electron interaction/restart evidence; final shell integration needs renewed captures.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../workspace.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

The versioned workspace permits at most `100` tabs and `40` groups. The reusable default dock is `left`; the current shell starts its repository workspace with the strip docked `top` and initially hidden. Order, pin/group/collapse metadata and split layout persist; sensitive draft values do not. Arrow navigation, `Alt+Shift+Arrow` reorder and `Ctrl+Shift+P` pin remain accessible routes.

## Failures and remaining work

Verify four independent searches, every docking edge, group/pin/reorder/overflow and guarded bulk close with live domain drafts.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](tabs.yue.md).
