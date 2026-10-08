# Publishing to a forge

Public feature identifier: `forge-publishing`. Category: **tools**.

## Required behavior

A application that publishes a repository lets the person choose the account and owner, backed by real multi-account sign-in where each token sits only in the operating-system credential store under an account-scoped key and an active account keeps single-account calls working. The account list is an accessible searchable list box with sign-out, set-active, and refresh actions. Copy-and-push is offered as an alternative to a fork where the provider cannot make one, and the route taken is always reported.

## Current support and configuration

Account/owner choices and reviewed repository create/fork actions exist. Cross-forge copy-and-push fallback is not established.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: not-applicable; repository: not-applicable**. See [implementation reference](../../authentication.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify multiple accounts, account-scoped OS storage, active context and actual route/permissions; never export tokens.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](forge-publishing.yue.md).
