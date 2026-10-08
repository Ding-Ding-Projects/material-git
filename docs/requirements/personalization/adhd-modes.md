# ADHD modes

Public feature identifier: `adhd-modes`. Category: **personalization**.

## Required behavior

Every user-facing application and GitHub Pages ships independently toggleable, persisted ADHD modes, never one master switch: Focus, Low stimulation, Time awareness, One thing at a time, and Momentum, each adapted to the surface and each off by default. Copy is plain, factual, and free of judgement, with no streaks, scores, or congratulation, and the modes are never presented as medical. Low stimulation composes with the operating system's reduced-motion preference, and School and Kids modes interact with them explicitly and documented.

## Current support and configuration

Five independent preference fields exist; complete adaptation of the new domain shell is pending.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

`focus`, `lowStimulation`, `timeAwareness`, `oneThing` and `momentum` default independently to `false`. `currentTask` defaults empty and accepts at most `2000` characters. Low stimulation participates in effective motion; a saved flag is not evidence of complete adaptation of every destination.

## Failures and remaining work

Verify each mode alone and in combinations, discoverable hidden work, quiet/motion interactions and restart.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](adhd-modes.yue.md).
