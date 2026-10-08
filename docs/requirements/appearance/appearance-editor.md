# Per-element appearance editor

Public feature identifier: `appearance-editor`. Category: **appearance**.

## Required behavior

Every rendered element, state, and pseudo-state, tabs and groups included, exposes **Edit appearance…** from its context menu and a keyboard path, opening a non-modal editor anchored beside that exact element that returns focus on close. The editor reaches Microsoft Word-depth typography and Adobe Photoshop-depth layered, non-destructive image editing across every interaction state, mapped by a hand-written capability matrix, alongside persisted runtime controls for theme, density, seed colour, and full UI font customization with a live preview. Edits are reversible per property, layer, state, element, and globally, with undo and redo, append-only history, named presets, copy and paste style, import and export, and live application that never touches stable identity.

## Current support and configuration

Element/state style editor exists; full typography/image-layer capability matrix remains an explicit obligation.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Appearance records expose `12` states: default, hover, focus, pressed, selected, disabled, dragged, validation, loading, success, warning and error. Each state permits at most `32` layers; an entire record is bounded to `131072` bytes. Numeric ranges and string enums are validated natively. This bounded CSS/layer model is not proof of complete Word/Photoshop-equivalent editing.

## Failures and remaining work

Audit each property/state/layer, undo/redo, presets, copy/import, keyboard/context access and unsupported explanations.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](appearance-editor.yue.md).
