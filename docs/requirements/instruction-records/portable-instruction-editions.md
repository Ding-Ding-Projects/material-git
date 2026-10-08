# Single-file editions of the canonical instruction repository

Public feature identifier: `portable-instruction-editions`. Category: **instruction-records**.

## Required behavior

`memory/UH_PROMPT.md` is the prompt edition, at most 5,000 characters in one fenced block, preserving every dictionary alias and refreshed in every task that changes a rule, term, route, or closeout duty. `memory/UH_FULL.md` is the capped full edition under 500,000 bytes for one Pastebin paste, and `memory/UH_PRO_MAX.md` with its manifest is the complete uncapped portable edition. Both generated editions are rebuilt whenever an included source changes and pass `--check`.

## Current support and configuration

This requirement belongs only to the canonical instruction repository.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: not-applicable**. See [implementation reference](../../../AGENTS.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Do not publish private dictionary-bearing portable editions in this public product.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](portable-instruction-editions.yue.md).
