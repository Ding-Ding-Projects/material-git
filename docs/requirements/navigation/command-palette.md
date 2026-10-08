# `Ctrl+Shift+F` command palette

Public feature identifier: `command-palette`. Category: **navigation**.

## Required behavior

Every user-facing application and GitHub Pages opens a command palette with `Ctrl+Shift+F`, with no competing `Ctrl+K` default, listing every command, feature page, article, destination, setting, and appearance control. Rows are rich live controls wired to the originating code, and selecting a result teleports to the exact element: its owning surface, tab or group, scroll position, focus, and a brief highlight. Size is a persisted choice between a bounded card, the default, and a full-window view, and the palette carries its own search with the regex builder.

## Current support and configuration

Palette indexes destinations/settings/articles/current controls, excludes inactive mounted tabs across shadow roots and does not list the command registry.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../workspace.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Open with `Ctrl+Shift+F`; `paletteSize` defaults to `card` and can be `window`. Results page in groups of `20` and include destinations, settings, articles and current-page controls. Hidden inactive tabs and palette-owned controls are excluded across shadow roots. App actions are contextual tasks, not a raw CLI catalog.

## Failures and remaining work

Verify Ctrl+Shift+F, persisted size, exact owning-route teleport and every actionable setting/contextual control.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](command-palette.yue.md).
