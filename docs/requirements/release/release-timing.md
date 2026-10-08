# End-to-end workflow timing in release notes

Public feature identifier: `release-timing`. Category: **release**.

## Required behavior

Every successful workflow-produced release records `Workflow started`, `Workflow completed`, and `Workflow duration` with UTC ISO-8601 timestamps and a stable `HH:mm:ss` duration, measured from the first job's `startedAt` through the final publication step and never estimated. A release without verified timing reports the missing evidence instead of pretending.

## Current support and configuration

Verified current end-to-end publication timing is external release evidence, not inferred from source.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Record first-job start through final publication UTC timestamps and stable duration; report missing timing honestly.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](release-timing.yue.md).
