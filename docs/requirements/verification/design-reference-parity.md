# Checked-in design-reference parity

Public feature identifier: `design-reference-parity`. Category: **verification**.

## Required behavior

Every UI project with a checked-in design-reference folder ships a dedicated plain design-reference desktop application, or the exact framework-appropriate equivalent, that renders the real reference files deterministically by screen, state, theme, viewport, and scale, while the real built application exposes matching routes. A hand-written per-screen inventory lists every reference exactly once with both routes, the full capture tuple, a Material Design 3 primitive audit, raw screenshots from both sides, a labelled side-by-side image, visual-diff evidence, and any reviewed deviation. The parity gate fails closed on any missing or stale element and is proven red then green.

## Current support and configuration

A design provenance document exists; actual checked-in design-reference files and matching renderer/parity evidence are not established. Confirm applicability after the source inventory.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: unknown; site: unknown; repository: not-applicable**. See [implementation reference](../../../design/material-provenance.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Enumerate each reference/capture tuple and validate raw pair/diff/reviewed deviation with a missing-item negative test.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](design-reference-parity.yue.md).
