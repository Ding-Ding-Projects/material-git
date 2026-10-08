# Export everything, in every format

Public feature identifier: `exports`. Category: **records**.

## Required behavior

Every record, view, list, log, document, setting, and generated artifact an application owns is exportable in every coding format that can faithfully carry it, chosen per datum, with any loss stated before the export runs. Exports are complete, re-importable where the shape allows, and state their encoding, line endings, and schema version. Archives are ZIP or 7z with the full 7z option set, encrypted headers included, relative paths, and no secret the surrounding flow has not marked as sensitive.

## Current support and configuration

Workspace/notification JSON records have typed reviewed imports; API/result/tools export subsets exist. All faithful formats and archive options are not complete.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../workspace.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Workspace records use schema `material-git-records`, version `1`, encoding `UTF-8` and kinds `workspace`, `notifications` or `revisions`. Import preview is bounded to `2` MiB; collections permit at most `500` records. Revision export is read-only. Other JSON/CSV/Markdown/text exports do not establish every archive or faithful-format requirement.

## Failures and remaining work

Per-datum format/loss/encoding/version matrix, reimport, ZIP/7z options and sensitive-data guards remain required.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](exports.yue.md).
