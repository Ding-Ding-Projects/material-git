# How long a human would have taken

Public feature identifier: `human-time-estimate`. Category: **repository**.

## Required behavior

Every application's README carries a labelled estimate, preferably a range, of how long a person would take to write the project by hand, beside the line counts. It shows its method, the hand-written line count from the committed counter, the assumed rate, any multiplier, and one line of arithmetic, and it excludes vendored, generated, and dependency or prerequisite trees exactly as the count does. It is refreshed from the same run as the counts and is never presented as a boast.

## Current support and configuration

No verified release line-count run is available to support a numeric estimate.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../README.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Publish method/rate/range beside counts only after matching workflow count; never invent time or manual line totals.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](human-time-estimate.yue.md).
