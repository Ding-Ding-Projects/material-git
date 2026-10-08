# One-click dependency or prerequisite fetcher

Public feature identifier: `dependency-fetcher`. Category: **build**.

## Required behavior

Every repository carries `download-dependencies.bat`, plus `download-dependencies.sh` wherever another platform is supported, that obtains every dependency or prerequisite needed to build, run, and test from canonical sources into user-scoped locations, pins exact versions, verifies recorded digests, and keeps a committed manifest of both. It is idempotent and silent-capable, reports per phase, and exits non-zero on the first real bug or failure. It never commits fetched dependencies and prerequisites or installs secrets or signing certificates, and `build.bat` calls it rather than duplicating it.

## Current support and configuration

Pinned scripted dependency acquisition exists with verified gh/MinGit packages. Complete clean cache-miss paths remain open.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Inventory every build/run/test prerequisite and prove canonical URLs/digests, user scope, idempotence and exact failure exit.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](dependency-fetcher.yue.md).
