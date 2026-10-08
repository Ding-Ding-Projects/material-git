# Settings that explain themselves

Public feature identifier: `settings-explanations`. Category: **navigation**.

## Required behavior

Every settings element carries its full explanation behind progressive disclosure, stating what the setting does rather than restating its label. Beside it, a truthful provenance line says whether the value came from a written file or from the compiled-in default, naming the real default value. Coverage is held by a hand-written list of every settings element, so an element with no explanation turns the gate red.

## Current support and configuration

Settings metadata and persisted-key provenance are integrated. Explanations across new controls still need full inventory checks.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Compare every settings key/control against hand-written required fields; explain effective/source/base values and actual defaults.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](settings-explanations.yue.md).
