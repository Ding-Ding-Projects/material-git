# layout clipping defect matrix for every built surface

Public feature identifier: `responsive-layout-matrix`. Category: **verification**.

## Required behavior

Every surface built from the Material Designer route receives a mandatory layout clipping defect matrix through the `diagnose-built-ui-layout` skill and the headless headless route, bound to the exact source commit and built artifact hash. It covers the normal and minimum supported viewport, English, Cantonese, and bilingual modes, light and dark themes, and 100, 125, 150, and 200% scales, from roughly 320 px upward for a GitHub Pages. Source inspection, a mock, or a design preview never satisfies it.

## Current support and configuration

Earlier headless captures do not prove all new domains/languages/scales.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../scroll-surface.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Run minimum/normal widths, EN/Yue/bilingual, both themes and100/125/150/200% scales at final commit/artifact hash.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](responsive-layout-matrix.yue.md).
