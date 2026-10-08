# Scheduled and external settings sources

Public feature identifier: `scheduled-settings`. Category: **personalization**.

## Required behavior

Every user-facing application and GitHub Pages ships a persisted schedule surface for the language mode, theme, density, seed colour, fonts, motion, display-name presentation, and every other appearance or customization value, with native accessible date and time pickers and stated timezone and daylight-saving semantics. Rules live in a versioned bounded schema with stable ids and deterministic precedence, and each rule takes its value from local data, a validated versioned HTTPS API, or a Home Assistant boolean entity. External sources refresh on a bounded interval with generation checks, fail safe to the last valid base state with a localized notification, keep tokens in the operating-system credential vault, and never persist an API value as the permanent base setting.

## Current support and configuration

Integrated preferences service evaluates local/HTTPS/Home Assistant rules separately from base settings; secret tokens are isolated.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Schedules start with no rules/connections and the machine's IANA timezone. Schema version `1` allows `64` rules, `16` approved connections and `262144` bytes. Refresh is `30`–`3600` seconds; response cap is `65536` bytes and timeout `8000` ms. Windows use `[start,end)`; equal times mean all day. Overnight rules belong to their starting date/weekday, repeated DST times match twice and nonexistent wall times never occur.

## Failures and remaining work

Re-drive midnight/DST/offline/stale-generation cases, every appearance value, authenticated sources and history restore.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](scheduled-settings.yue.md).
