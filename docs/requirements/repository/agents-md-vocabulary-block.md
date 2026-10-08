# Sanitized vocabulary-discipline block in `AGENTS.md`

Public feature identifier: `agents-md-vocabulary-block`. Category: **repository**.

## Required behavior

Every repository, public and private alike, carries the canonical `## Agent conversation vocabulary` block in its `AGENTS.md`, copied verbatim from the payload and naming no term, so every agent learns the discipline before its first reply. It is added or refreshed in the same task that touches the repository, followed by the canonical leak scan before the push.

## Current support and configuration

Canonical neutral vocabulary-discipline block is copied byte-for-byte; no private terms are restated.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../AGENTS.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

The neutral `Agent conversation vocabulary` block is compared byte-for-byte with canonical wording, with no private aliases restated. Public-bound Markdown must pass the canonical scan. This conversation discipline does not establish a runtime dictionary currency lock.

## Failures and remaining work

Compare exact block bytes and run canonical public leak scan on every changed public file.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](agents-md-vocabulary-block.yue.md).
