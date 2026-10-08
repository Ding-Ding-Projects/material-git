# Root `build.bat` and `build-installer.bat`

Public feature identifier: `build-entrypoints`. Category: **build**.

## Required behavior

Every repository carries real working root `build.bat` and `build-installer.bat` entrypoints that take a fresh Microsoft Windows checkout to a built runnable application and to the release-equivalent installer, installing every dependency or prerequisite themselves in user scope, pre-elevating interactively, supporting `/s`, `--silent`, and `SILENT=1`, reporting each phase honestly, staying idempotent, and propagating the real child exit result. Every build and installer production, every manual release included, invokes these exact entrypoints, and the installer script verifies and prints its artifact path and SHA-256 and never publishes, tags, or pushes. An repository with no installable target documents exact nonapplicability with an honest non-success result.

## Current support and configuration

Root batch entrypoints and pinned dependency fetching exist. Fresh Windows clean-machine execution remains unverified locally.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Prove silent/idempotent user-scope bootstrap, real child failures, installer digest and no publication from build scripts.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](build-entrypoints.yue.md).
