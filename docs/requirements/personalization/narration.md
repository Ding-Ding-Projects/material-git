# Spoken narrator and voice pickers

Public feature identifier: `narration`. Category: **personalization**.

## Required behavior

Every user-facing application ships a spoken narrator for its events, off by default and enabled only by the person using it, narrating English, Cantonese, or Both strictly serialized, with a Hong Kong Cantonese voice for the Cantonese track. Each narrated language has its own voice picker listing the voices the machine actually has, with **Choose automatically** as the shipped default, the stable voice identity persisted, late enumeration handled, the voice really in effect stated beneath it, and adjustable rate and pitch. Narration is debounced, rate-limited per category, one utterance at a time, never suppresses spoken issue facts, and yields to an active screen reader.

## Current support and configuration

Installed-voice discovery and serialized narration exist; actual voice availability depends on the OS.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../personalization.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify late/empty enumeration, missing Cantonese voice, screen-reader interaction and rate/pitch boundaries.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](narration.yue.md).
