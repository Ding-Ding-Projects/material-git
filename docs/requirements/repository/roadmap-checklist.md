# `ROADMAP.md` checklist

Public feature identifier: `roadmap-checklist`. Category: **repository**.

## Required behavior

Every project keeps `ROADMAP.md` as a Markdown checklist with real `- [ ]` and `- [x]` boxes grouped by phase or milestone, updated in every project-changing task. A tick is a claim made only when the item is implemented, verified, and captured where it is visible. Dropped items are struck through or moved to a deliberately-not-doing section with the reason, never silently deleted.

## Current support and configuration

All104 obligations remain explicitly tracked; unchecked means remaining implementation or proof.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../ROADMAP.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Real `- [ ]` and `- [x]` items remain grouped by phase/category. An unchecked requirement retains its implementation or evidence gap. Not-applicable scope is explained rather than silently removed; research checks do not close runtime feature boxes.

## Failures and remaining work

Only check items when implemented/verified/captured; preserve dropped scope with an explicit reason.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](roadmap-checklist.yue.md).
