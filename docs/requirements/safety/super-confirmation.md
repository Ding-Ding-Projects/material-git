# Two-key super confirmation

Public feature identifier: `super-confirmation`. Category: **safety**.

## Required behavior

Every destructive action passes a two-key confirmation built in the application's own native UI layer, never a helper application, hosted page, or external CAPTCHA, preferably anchored beside the destructive control. The confirmation names the exact action and affected data, needs two independently operated keys before a full-range slider enables, animates progress and completion, offers an always-available **Emergency exit** plus Escape or back, returns focus, and never acts until both keys and the slider complete. Safety facts stay unambiguous at every language mode and funny level.

## Current support and configuration

Native two-key confirmation guards reviewed destructive actions. New Git action integration needs complete guard coverage.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../security.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Destructive domain apply is blocked unless both independent confirmation controls are true and the confirmation value is exactly `100`. Saving reentry is also blocked. Non-destructive mutation still needs a valid native review receipt; a visible confirm dialog cannot bypass native validation.

## Failures and remaining work

Verify independent keys/full slider/Emergency exit/Escape/focus, exact target scope and no mutation before completion.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](super-confirmation.yue.md).
