# Material Design 3 conformance

Public feature identifier: `material-design`. Category: **appearance**.

## Required behavior

Every user-facing application, GitHub Pages, and extension page conforms fully to Material Design 3 Expressive, its tokens, typography, shape, elevation, motion, and component anatomy, with zero legacy or original design elements remaining. Every rendered component, control, and layout surface uses a registered genuine Material Design 3 primitive, generic HTML survives only as document plumbing or inside a registered component's internals, and functional data colours stay exempt as data, not chrome. A hand-written per-surface inventory records each component's registration and provenance.

## Current support and configuration

Registered Material controls and token provenance are documented; the remade shell needs a renewed complete primitive audit.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../../design/material-provenance.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Audit every rendered surface, genuine registrations and a negative replacement regression.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](material-design.yue.md).
