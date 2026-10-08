# Dim sum surprise

Public feature identifier: `dim-sum`. Category: **personalization**.

## Required behavior

Every user-facing application has a 10% chance at startup, drawn fresh per launch and at most once, to show one randomly chosen dish with its English and Cantonese names and its picture. The surprise is non-blocking and auto-dismissing, never holds up startup or steals focus, never appears during a first run, a bug or failure, an update, or a task in progress, and respects reduced motion and quiet settings with alt text naming the dish. It cannot be opted out of, an existing off switch is removed with stored preferences migrated forward, and School mode suppresses it; pictures come only from the public catalogue under `dim-sum-photo-source`, so read both canonical sections together.

## Current support and configuration

Public-catalog-based surprise support exists. No local generated photo is acceptable evidence.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify10% startup draw and once-per-launch behavior plus first-run/busy/error/update/School suppression.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](dim-sum.yue.md).
