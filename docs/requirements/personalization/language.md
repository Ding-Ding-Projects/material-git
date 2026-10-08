# Language modes

Public feature identifier: `language`. Category: **personalization**.

## Required behavior

Every user-facing application and GitHub Pages ships a persisted language mode with exactly three baseline choices: English, playful Hong Kong-style Cantonese, and bilingual. Bilingual mode keeps the primary label prominent with a compact secondary label or progressive disclosure, so narrow layouts never crowd. Localization resources stay separate from logic with fallback behaviour, and non-UI libraries are exempt only until they expose a user-facing surface.

## Current support and configuration

Three language settings and separate localization resources exist. Fresh domain screens still need complete EN/Yue/bilingual review.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

The Settings language control writes `language` as `en`, `yue` or `both`; its shipped default is `en`. School mode applies an effective English override without changing the saved base language. Provider-authored content and literal identifiers are not translated as application labels.

## Failures and remaining work

Audit every domain, warning, dialog, settings explanation and narrow bilingual label; separate literal provider text from application copy.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](language.yue.md).
