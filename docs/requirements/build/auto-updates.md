# Chrome-style automatic updates

Public feature identifier: `auto-updates`. Category: **build**.

## Required behavior

Every installed user-facing application checks for updates at startup and on a bounded background schedule, validates the unsigned Squirrel feed metadata and package hashes over HTTPS without interrupting work, stages the update, and shows a persistent non-blocking ready banner with the exact version, a release-note link, an unsigned artifact warning, **Restart to install update**, and **Later**. Restart happens only on the person's choice with unsaved-work protection. The updater is on by default with a visible state and a manual **Check for updates** command, and an update bug or failure is never hidden behind a spinner.

## Current support and configuration

Squirrel feed/update state handling exists. Installed Windows startup/background/stage/restart behavior remains unverified here.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: not-applicable; repository: not-applicable**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify HTTPS/feed/package hashes, exact version banner/Later, no forced restart, unsaved guards and persistent errors.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](auto-updates.yue.md).
