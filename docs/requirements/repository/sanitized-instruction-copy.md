# Sanitized instruction mirror

Public feature identifier: `sanitized-instruction-copy`. Category: **repository**.

## Required behavior

Every project keeps a clearly labelled, sanitized mirror of the shared instructions in its `README.md` and `AGENTS.md`, refreshed when the instructions change, with every machine, account, host, path, address, and credential detail generalized rather than deleted. The whole private vocabulary is omitted from any mirror in a public repository, and changes are always made in the canonical instruction repository first.

## Current support and configuration

Full canonical instruction export currently fails its own public guard. A clearly labelled project-specific summary is safe to publish.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: blocked**. See [implementation reference](../../requirements/shared-instructions.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Correct canonical export upstream, regenerate full mirror using canonical helper, generalize private details and scan before publication.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](sanitized-instruction-copy.yue.md).
