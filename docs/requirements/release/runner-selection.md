# Live GitHub Actions runner selection

Public feature identifier: `runner-selection`. Category: **release**.

## Required behavior

Before wiring or dispatching a job, `gh` inspects the self-hosted GitHub Actions runner inventory, access, state, platform, capacity, and labels, a compatible self-hosted GitHub Actions runner is used only when it is genuinely available, and otherwise a pinned GitHub-hosted cloud image runs the job. A self-hosted GitHub Actions runner on a public repository never takes a `pull_request` trigger, keeps write-access triggers, and stays resource-constrained. No workflow is left queued against an offline label.

## Current support and configuration

Actual live compatible runner inventory selection is release-owner evidence not available in this documentation audit.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Inspect capacity/labels/access; avoid offline queues/public pull-request exposure and use a pinned hosted fallback.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](runner-selection.yue.md).
