# Design surfaces live in the repository

Public feature identifier: `design-folder`. Category: **verification**.

## Required behavior

Every design-tool surface, Claude Design and Material Designer work included, is committed to the repository's own `design/` folder and pushed in the same task that creates or changes it, because the hosted project is only a viewing surface. Design files carry no private vocabulary, and a prototype or preview is never called shipped behaviour.

## Current support and configuration

Committed design folder is present; current task files must remain distinguishable from shipped UI.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../design/material-provenance.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Track all design-source changes and public scans; verify pushed refs through release owner.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](design-folder.yue.md).
