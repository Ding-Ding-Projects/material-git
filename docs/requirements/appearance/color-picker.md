# Infinite colour picker and translator

Public feature identifier: `color-picker`. Category: **appearance**.

## Required behavior

Every colour control is an infinite picker, a continuous spectrum, wheel, or two-dimensional field plus numeric entry, never a swatch-only chooser, with a translator across named colours, HEX and HEX8, RGB, HSL, HSV, HWB, CIELAB and LCH, OKLab and OKLCH, and CMYK that preserves alpha, names the active space and gamut, warns before gamut loss, and shows contrast. The animated rainbow is one of its choices: a sentinel outside the palette, animated in the stylesheet around the hue wheel, with one global duration, speed stored as a level, and one settled hue under reduced motion. The pickers theme themselves and the chrome around them, carry a search with the regex builder, and never silently drop a value they cannot represent.

## Current support and configuration

Continuous color input and conversion support exist, with advanced picker source work integrated.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../converters.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Exercise every named color space, alpha/gamut/contrast, rainbow and reduced-motion behavior on app and site.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](color-picker.yue.md).
