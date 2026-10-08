# Local personal-vocabulary JSON upload

Public feature identifier: `personal-vocabulary`. Category: **personalization**.

## Required behavior

Every user-facing application and GitHub Pages shows a visible local personal-vocabulary JSON upload control in its own settings, even before any file exists, with localized no-file, loaded, invalid, replace, and clear or reset states that settings search and the command palette index. One documented, versioned, bounded schema is validated in full before display or caching, a rejected file never applies partially, clearing purges the cache, and original shipped wording renders until a valid private file arrives. Handling is local-only, so no private vocabulary value, mapping, payload, or file metadata ever reaches source, logs, exports, history, telemetry, prompts, or any public record.

## Current support and configuration

Local bounded schema validation and private cache are implemented separately from ordinary exports.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

The local import accepts schema `schemaVersion: 1` with an `entries` object, at most `65536` UTF-8 bytes and `256` mappings. Keys are `1`–`128` characters and replacements `1`–`256`; duplicate/unsafe JSON keys and control characters are rejected before application. Never use a private file as a published test fixture.

## Failures and remaining work

Re-drive empty/upload/invalid/replace/clear, duplicate keys, restart and no-network behavior on final build without capturing private values.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](personal-vocabulary.yue.md).
