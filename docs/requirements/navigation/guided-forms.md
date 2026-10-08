# Guided forms

Public feature identifier: `guided-forms`. Category: **navigation**.

## Required behavior

Forms assume the person does not know what to type: pickers are populated from real data, sanitized suggested defaults replace blank boxes, validation is inline in plain words, and free text stays available but is never the only path when real valid values exist. Every disabled control names its unmet condition, every path text box carries a native browse control run through the same validation, and expert tuning knobs get an honest novice control, such as a documented 1 to 5 Speed level, that shows **Custom** instead of guessing.

## Current support and configuration

Entity choices and reviewed typed domain actions exist; all Git/GitHub option semantics are mapped as remaining action-specific obligations.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../api-explorer.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Replace blank identifier fields with actual choices/browse paths and explain missing permissions/dependencies inline.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](guided-forms.yue.md).
