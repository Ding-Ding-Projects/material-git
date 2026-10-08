# Every application bundles its dependencies and prerequisites

Public feature identifier: `bundled-dependencies`. Category: **build**.

## Required behavior

Every user-facing application ships every dependency or prerequisite it needs inside its own installer and works with the network unplugged: "install X and try again" in any wording is a bug or failure, portable distributions are preferred, and a licence that forbids redistribution means verified automatic acquisition, never a link. Bundled-first resolution names which copy is in use, a not-found state lists every location searched, and the bundle is proven from the installed artifact rather than the configuration. Optional integration targets such as editors stay links whose copy never reads as a missing dependency or prerequisite.

## Current support and configuration

Windows includes GitHub CLI and MinGit. Universal converter/runtime dependencies and unplugged installed behavior are not complete.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: not-applicable; repository: not-applicable**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Inspect installed artifact paths/version/licenses and offline operation; external optional editors remain separately identified.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](bundled-dependencies.yue.md).
