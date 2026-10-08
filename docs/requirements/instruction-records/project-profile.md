# Project memory folders

Public feature identifier: `project-profile`. Category: **instruction-records**.

## Required behavior

Every repository with project memory owns one folder under `memory/projects/` with a required sanitized profile `README.md`, an optional verified-method `lessons.md`, and an optional `private/` snapshot that is never mirrored. Global agent behaviour never lives there, and each profile states its project-specific scope.

## Current support and configuration

External canonical project-memory profile state has not been inspected in this audit.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../HANDOFF.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Maintainer updates sanitized project-specific profile separately; never mirror its private snapshot.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](project-profile.yue.md).
