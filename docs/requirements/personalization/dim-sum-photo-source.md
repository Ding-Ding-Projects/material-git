# Public dim-sum photo source

Public feature identifier: `dim-sum-photo-source`. Category: **personalization**.

## Required behavior

agents never generate, download, scrape, or vendor dim-sum photos in consumer repositories: the sole public source is `Ding-Ding-Projects/dim-sum-photos`, whose `catalog/index.json` names are authoritative and whose published `catalog-v1*` release assets are the only photos, reached by public asset URL or an application-data cache. A missing public image is omitted and reported, never filled locally, and legacy dim-sum files inside a repository are migration material to move off. `Ding-Ding-Projects/dim-sum-catalog-archive` is recovery and audit storage only, never a consumer route.

## Current support and configuration

Consumer source is the public dish-photo catalogue and release assets, never a local substitute.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: partial**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify catalogue revision/cache provenance and genuine unavailable-photo behavior; do not commit consumer copies.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](dim-sum-photo-source.yue.md).
