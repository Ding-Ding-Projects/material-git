# Built-in authenticator

Public feature identifier: `authenticator`. Category: **safety**.

## Required behavior

Every user-facing application ships its own authenticator as an ordinary tabbed, searchable, palette-reachable destination for arbitrary TOTP secrets, registered by `otpauth://` URI, by QR from an image file or the clipboard, by camera where available, or by manual base32. Codes are standards-exact RFC 6238 over RFC 4226 with SHA-1, SHA-256, and SHA-512, 6 to 8 digits, and arbitrary periods verified against the published vectors, shown large with copy, a readable countdown, and a next-code peek, and a skewed clock is reported in plain words. Everything stays local in the operating-system credential vault, ordinary exports omit secrets and say so, and a secrets export sits behind super confirmation.

## Current support and configuration

Native RFC TOTP validation and encrypted records have tests. QR image/camera and final GUI/platform support require separate evidence.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../security.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify RFC vectors, algorithms/digits/period, countdown/skew, all registration paths and confirmed sensitive exports.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](authenticator.yue.md).
