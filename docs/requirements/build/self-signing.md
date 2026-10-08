# Required-format self-signing only

Public feature identifier: `self-signing`. Category: **build**.

## Required behavior

Outputs are signed only when their required format or runtime demands it, and then only with a project-owned self-signed credential held in protected local storage or a GitHub Actions secret store, never a public certificate authority, paid certificate, signing service, or timestamp service. A CRX requirement is met by a genuine self-signed CRX3 with a stable project-owned key, and the signature is verified mathematically before release. Release material states that self-signing proves only possession of the key.

## Current support and configuration

Windows artifacts are intentionally unsigned and their format does not require a signature.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: not-applicable**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Do not add paid/public signing claims; any future format requiring self-signing needs protected project key and mathematical verification.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](self-signing.yue.md).
