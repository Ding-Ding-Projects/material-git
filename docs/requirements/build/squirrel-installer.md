# Genuine Squirrel.Windows installers

Public feature identifier: `squirrel-installer`. Category: **build**.

## Required behavior

Every supported Microsoft Windows installer for every installed application, whatever its framework, is genuine Squirrel.Windows shipping `Setup.exe`, `RELEASES`, the full `.nupkg`, and generated deltas where available. Every other installer route is migrated or removed, and a framework limitation is a packaging problem to solve, never an exemption. Release notes and installer status say plainly that the artifacts are unsigned and may meet an unknown-publisher or SmartScreen warning, with no authenticity claim.

## Current support and configuration

Packaging targets unsigned Squirrel Setup.exe/RELEASES/full package. Windows install/update evidence remains a separate obligation.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: not-applicable; repository: partial**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify generated artifacts/hashes/deltas where available and disclose unsigned SmartScreen behavior.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](squirrel-installer.yue.md).
