# The unlock ladder

Public feature identifier: `unlock-ladder`. Category: **safety**.

## Required behavior

Every application and GitHub Pages that can lock a person out ships the ladder in order: a dim-sum rung with one dish and four choices, ten easy sums, whack-a-mole, then the clock. It clears the waiting and never the credential, never refunds the attempt budget, is capped per rolling hour, leaves exponential escalation untouched, and grades every answer server-side against a single-use nonce. Timed rounds cannot be won early, each mole counts once, and under School mode the ladder starts at the sums with the dim-sum rung absent.

## Current support and configuration

Native ladder/scoring and attempt limits exist with School-mode variant. Full timed interaction evidence remains pending.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../security.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify nonce/replay/expiry, non-early-win timed rounds, per-hour limit and unchanged credential/attempt budget.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](unlock-ladder.yue.md).
