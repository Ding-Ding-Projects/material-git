# Vocabulary hash lock

Public feature identifier: `vocabulary-hash-lock`. Category: **repository**.

## Required behavior

Every repository holds its builds and its pushes behind a lock derived at run time from the dictionary, with the expected value kept beside the private source and neither the terms nor the hash ever committed. A missing private source is skipped with the reason printed, while a present but stale lock fails closed. The gate says plainly that it proves possession and currency of the dictionary, not that anyone spoke it.

## Current support and configuration

Private-source-derived build/push currency lock is not evidenced in this public repository.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../AGENTS.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Implement runtime private lock without committing terms/hash; missing-source skip reason and stale-source failure require separate tests.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](vocabulary-hash-lock.yue.md).
