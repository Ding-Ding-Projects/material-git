# Changelog viewer

Public feature identifier: `changelog`. Category: **records**.

## Required behavior

Every user-facing application ships a changelog viewer covering every released version with its version, date, categorized changes, and the full commit SHA as a short clickable reference validated against the real forge, reachable from Help or About. It filters with an advanced calendar date picker that also accepts typed dates, searches with the regex builder, composes both, and exports or copies the filtered view with its range and SHAs. Entries are factual, never invented, and brought current in every project-changing task.

## Current support and configuration

Release/reference links exist; a complete release viewer with date/search/export and verified full SHAs remains open.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../workspace.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Use real releases only, compose typed dates/regex filtering and export the exact filtered range.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](changelog.yue.md).
