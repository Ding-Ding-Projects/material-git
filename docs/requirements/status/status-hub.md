# Status Hub registration and status surface

Public feature identifier: `status-hub`. Category: **status**.

## Required behavior

The shared Status Hub is a canonical feature of every project and every application: every project registers its repository, default branch, release channel, real gate verdicts, and a stable link, and every application ships its own Material Design 3 status surface showing what the Hub sees with emoji-bearing states and the evidence behind each claim. Hub rows are evidence, never intent, and no Hub control, such as a question card's **Send answer**, may appear to deliver without reaching the session inbox. Every completeness inventory carries a Status Hub row like any other feature.

## Current support and configuration

Required project registration/status surface is not evidenced; not treated as optional.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: open; site: unknown; repository: partial**. See [implementation reference](../../requirements/README.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Release owner must verify registration/link/evidence-backed states and native status presentation without inventing sent messages.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](status-hub.yue.md).
