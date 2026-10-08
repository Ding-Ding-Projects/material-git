# A real picture when a link is pasted into Discord

Public feature identifier: `shared-link-embed`. Category: **documentation-site**.

## Required behavior

Every repository and every page it publishes renders a large embedded graphic of the actual product when its link is shared, never the auto-generated metadata card, a stock image, or a mockup. `social-preview.png` sits committed at the repository root, any served copy comes from the same script and is proven byte-identical, and every page serves `og:` title, description, URL, type, site name, an absolute `https://` image with width, height, and alt, `twitter:card` set to `summary_large_image`, and `theme-color` in the HTML the server sends. The image is fetchable anonymously with no a crawler-policy file disallow and changes URL when it changes, and the manual social-preview upload is handed to user with the exact root path and tracked until confirmed.

## Current support and configuration

A current root social-preview image, anonymous served bytes and crawler metadata parity are not verified.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: unknown; repository: partial**. See [implementation reference](../../site.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Generate from real product screenshot, verify served metadata/image bytes anonymously and record manual repository-preview upload state.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](shared-link-embed.yue.md).
