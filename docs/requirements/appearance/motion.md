# Material Design 3 motion with a complete reduced-motion path

Public feature identifier: `motion`. Category: **appearance**.

## Required behavior

Motion follows Material Design 3 motion everywhere and is one of the persisted appearance values a person can customize and schedule. Every animated surface treats reduced-motion respect as a completion blocker rather than polish: the animated rainbow settles on one hue, the super-confirmation and ladder animations stay understandable without motion, and Low stimulation composes with the operating-system preference instead of overriding it. Motion never becomes the only carrier of a state.

## Current support and configuration

Reduced-motion and motion preferences exist. Every new transition has not been independently inspected.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify OS preference composition, rainbow/confirmation/ladder alternatives and persisted schedules.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](motion.yue.md).
