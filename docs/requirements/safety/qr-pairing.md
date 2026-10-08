# QR pairing for OTP registration

Public feature identifier: `qr-pairing`. Category: **safety**.

## Required behavior

Wherever an application asks someone to pair an authenticator, it generates the secret locally and draws a scannable QR of a standard `otpauth://totp/` URI in-process, never through an online service, beside the copyable grouped base32 secret, algorithm, digits, and period. The QR keeps its quiet zone and true dark-on-light contrast in both themes, and the secret is revealed only by explicit action and never written to hard disk, a log, a screenshot, an export, telemetry, or history. The factor arms only after the person types back one current code.

## Current support and configuration

Local OTP URI/QR generation and code verification are available in native pairing.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../security.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Pairing generates `20` random bytes locally and returns a standard `otpauth://totp/` URI. Enrollment verifies a current code before encrypting the record. The same algorithm/digits/period validation as the authenticator applies; an unavailable OS vault refuses secret storage.

## Failures and remaining work

Verify both themes/quiet zone, explicit secret reveal, no plaintext persistence and activation only after one valid current code.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](qr-pairing.yue.md).
