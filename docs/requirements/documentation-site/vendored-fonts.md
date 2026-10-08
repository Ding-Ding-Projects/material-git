# Complete, scripted font vendoring

Public feature identifier: `vendored-fonts`. Category: **documentation-site**.

## Required behavior

Fonts are vendored complete by a committed script that fetches the exact URL the design asks for with a modern browser `User-Agent`, downloads every file the request returns, preserves `font-weight` and `unicode-range`, declares only axes the binary has, and records a SHA-256 per file in a committed manifest, stopping loudly on a partial set. The result is verified in the built artifact with `document.fonts.check` and the computed `fontFamily`, never by reading configuration.

## Current support and configuration

Local font assets exist; full exact-request vendoring/manifest and final computed-font evidence need audit.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: partial**. See [implementation reference](../../../design/material-provenance.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify all returned weight/subset files, checksums and actual document.fonts/computed font in each built surface.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](vendored-fonts.yue.md).
