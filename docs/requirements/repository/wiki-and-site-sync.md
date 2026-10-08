# Wiki and GitHub Pages source kept current

Public feature identifier: `wiki-and-site-sync`. Category: **repository**.

## Required behavior

Every project-changing task updates the GitHub wiki and any existing GitHub Pages source. Public repository applications create the mandatory GitHub Pages when the host supports it; private repositories are exempt from mandatory GitHub Pages creation and may retain an optional private surface. Publishing either one never sets off an endless loop of base repository pushes.

## Current support and configuration

Repository articles are current at this checkpoint; remote wiki and deployed site sync remain release-owner tasks.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: unknown; repository: partial**. See [implementation reference](../../site.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify published wiki/site independently and prevent publication loops; preserve owner-private site audience.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](wiki-and-site-sync.yue.md).
