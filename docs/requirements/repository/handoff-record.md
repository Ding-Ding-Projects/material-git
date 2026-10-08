# `HANDOFF.md` and the GitHub handoff section

Public feature identifier: `handoff-record`. Category: **repository**.

## Required behavior

`HANDOFF.md` stays factual: what changed, verification evidence, remaining work, and external-state blockers, never an unverified success. Every handoff also gets a titled section on a GitHub bug or failure with the scope, branch or commit, changed files, verification, remaining work, blockers, and the next owner, posted as the work changes state.

## Current support and configuration

Local handoff is refreshed with exact evidence and remaining work; remote titled handoff record is not posted by this lane.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../HANDOFF.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Release owner posts only authorized record with commit/checks/blockers/next owner and proves remote state.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](handoff-record.yue.md).
