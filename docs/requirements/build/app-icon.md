# Original logo and packaged icon

Public feature identifier: `app-icon`. Category: **build**.

## Required behavior

Every user-facing application carries an original, project-appropriate logo and a real packaged application icon before release, generated from a committed master source into valid platform formats, a multi-resolution `.ico` on Microsoft Windows included, and wired into chrome, executable, installer, and update metadata. A framework default, a missing mark, a mutable or unreachable icon URL, or a renamed raster blocks release-grade shutdown, and the built artifact is inspected at small and standard sizes.

## Current support and configuration

Project master/platform icon generation exists. Actual Windows chrome/installer/update icon inspection remains pending.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: not-applicable; repository: partial**. See [implementation reference](../../../design/material-provenance.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify original committed source, multi-resolution ICO and small/standard packaged sizes.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](app-icon.yue.md).
