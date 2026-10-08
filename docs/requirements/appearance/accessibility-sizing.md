# Accessibility, sizing, and layout without layout clipping defect

Public feature identifier: `accessibility-sizing`. Category: **appearance**.

## Required behavior

Accessibility bugs or failures are completion blockers wherever they are met: keyboard reachability, visible focus, correct roles, names, and states, contrast, reduced motion, and screen-reader structure. No text or control may suffer a layout clipping defect, overlap, or sit off-screen at any supported window size, display scale, density, or language mode, and controls keep their design size, adequate touch targets, and sibling consistency at 100, 125, 150, and 200% scale. A screenshot that shows a sizing, layout clipping defect, or accessibility bug or failure pulls its fix into the task's scope.

## Current support and configuration

Keyboard paths and Material components have focused checks. The full viewport/language/density/scale matrix remains open.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../scroll-surface.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Capture minimum and normal widths at100/125/150/200% scale and audit names, focus, contrast and screen-reader structure.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](accessibility-sizing.yue.md).
