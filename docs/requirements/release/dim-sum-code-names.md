# Dim sum release code names

Public feature identifier: `dim-sum-code-names`. Category: **release**.

## Required behavior

Every build or release carries a dim sum code name beside its version, using a dish's exact `name.en` and `name.zhHant` from the public catalogue, chosen only from dishes whose public photo is published, used once per project, and recorded so the mapping is auditable. The code name and a public photo link appear in the release notes, the changelog viewer, the GitHub Pages release section, and the About surface, with factual names at every funny level. An unavailable catalogue never blocks, delays, or renames a release.

## Current support and configuration

Next build/release code-name mapping and all display destinations need release manifest evidence.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: partial**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Use unused exact public-catalogue EN/Yue names only when photo published; catalogue absence must not block release.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](dim-sum-code-names.yue.md).
