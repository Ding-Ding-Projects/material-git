# Local version history

Public feature identifier: `local-history`. Category: **records**.

## Required behavior

Every application that owns documents, projects, or other person-managed records keeps a local Git-backed history isolated beside its own data directory, never a `.git` inside the person's folder, covering documents, accounts, credentials, connected services, rules, and settings so any change can be undone. Restores are new revisions, history is append-only, snapshots keep ciphertext as ciphertext with authenticated-encryption bindings that survive restore, and revisions are labelled with what actually changed. The panel browses, diffs, restores, labels, prunes, and exports with an advanced date picker, real derived action filters with counts, and its own regex search, while secrets and display names follow the password-protected mutation-history contract with one commit per mutation and no plaintext secret.

## Current support and configuration

Isolated Git-backed sanitized workspace/external record history and async restore dispatcher exist. Complete per-kind restore UI and hooks remain open.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../workspace.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

History lives in isolated application-owned Git storage. Restore dispatch is asynchronous and per-kind validation belongs to trusted native restorers. The sanitizer excludes secret/draft/content/provider fields and may retain ciphertext. Discard records capture tab/layout metadata only, not recoverable draft text.

## Failures and remaining work

Prove one revision per actual mutation and append-only restores for settings/accounts/encrypted factors/schedules/discards; never plaintext tokens.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](local-history.yue.md).
