# A dim-sum photo on every release

Public feature identifier: `release-dim-sum-photo`. Category: **release**.

## Required behavior

Every GitHub release attaches at least one real, decodable dim-sum photo as a downloadable image asset, naming the dish and exact asset file name in the notes, chosen only from verified catalogue images and never generated or fetched during publishing. Read it together with `dim-sum-photo-source`; the canonical sections govern any tension between them.

## Current support and configuration

Release photo attachment from verified public catalogue is not proven for next release.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Release owner verifies real decodable asset/exact dish+filename and never fetches/generates a substitute during publishing.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](release-dim-sum-photo.yue.md).
