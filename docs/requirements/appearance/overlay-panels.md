# Overlays and panels

Public feature identifier: `overlay-panels`. Category: **appearance**.

## Required behavior

Every popover, menu, dropdown, tooltip, and anchored panel paints its own background, border, elevation, and shape, stays bounded by the viewport, and scrolls when its content does not fit instead of hiding the overflow. Overlays never paint outside their card, sit under their opener, or cover the control they anchor to. Every panel is resizable from its edges and corners, floating panels also drag by their header, both have keyboard paths, and size and position persist per surface with a reset.

## Current support and configuration

Material overlays and resizable application panels exist; universal drag/resize/persistence is not established.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../scroll-surface.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify viewport containment and keyboard drag/resize/reset for every new overlay at all scales.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](overlay-panels.yue.md).
