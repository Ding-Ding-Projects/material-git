# Postman collections for HTTP APIs

Public feature identifier: `postman-collections`. Category: **repository**.

## Required behavior

An HTTP or API category carries a category-level Postman collection with explanatory Markdown where useful, and the project keeps a master Postman collection JSON that links or contains every applicable API. A project with no HTTP API records that nonapplicability in the category index instead of inventing collections.

## Current support and configuration

Product calls upstream GitHub APIs; category/master Postman collections are not yet verified.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../requirements/README.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Provide token-free collections for actual endpoints and environments with documented permission/effect boundaries; no remote mutation during audit.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](postman-collections.yue.md).
