# Funny-level sliders and the dialog emoji switch

Public feature identifier: `funny-emoji`. Category: **personalization**.

## Required behavior

Two independent persisted funny-level sliders, one for English and one for Cantonese, run from 1 (fully serious) to 5 (maximum playfulness), ship at 5, and reset independently. They are wired to the copy of every message category, issue, destructive, financial, security, and accessibility copy included, change voice and never facts, and are disclosed at first run and in the setting itself. A persisted **Show emojis in dialogs and message boxes** switch adds one relevant non-semantic emoji per dialog and never puts emoji in buttons, labels, or accessible names.

## Current support and configuration

Settings expose separate English/Cantonese levels and dialog emoji preference. Universal message-category coverage remains unproven.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Compare levels1/5 across safety and accessibility messages without changing facts or accessible names.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](funny-emoji.yue.md).
