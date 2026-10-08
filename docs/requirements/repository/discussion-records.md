# Discussions as the running record

Public feature identifier: `discussion-records`. Category: **repository**.

## Required behavior

GitHub Discussions are enabled where supported, each active task keeps one rolling progress Discussion with frequent factual milestone comments, and each build or release gets exactly one changelog Announcement whose comments carry every push, GitHub Actions verdict, and artifact. The newest agent-created Announcement is pinned, and only a provably agent-managed older pin is unpinned.

## Current support and configuration

No Discussions enablement/rolling task/Announcement/pin state is verified by this read-only lane.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../HANDOFF.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Authorized publishing owner records actual milestones/artifacts and only replaces provably agent-managed pins.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](discussion-records.yue.md).
