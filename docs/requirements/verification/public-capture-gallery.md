# Public screenshot gallery at resource limit

Public feature identifier: `public-capture-gallery`. Category: **verification**.

## Required behavior

At each resource limit pass one `gpt-6-luna` implementation subagent creates or updates a dedicated public repository and public GitHub Pages carrying every reviewed, publishable, genuine screenshot of the current project, while the source repository stays private. Pixels, captions, metadata, and file names are reviewed, private vocabulary and private details are excluded, and capture dates come only from validated provenance. Public visibility, the live GitHub Pages, and each image are verified separately from the source push.

## Current support and configuration

No independent current public screenshot-gallery publication is verified.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: unknown; repository: partial**. See [implementation reference](../../local-verification.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Review pixels/captions/metadata and separately verify anonymous gallery URL and each genuine capture; publication remains with release owner.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](public-capture-gallery.yue.md).
