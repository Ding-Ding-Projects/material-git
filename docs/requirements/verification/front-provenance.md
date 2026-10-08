# Front-screen version and updated-at provenance

Public feature identifier: `front-provenance`. Category: **verification**.

## Required behavior

Every user-facing application and GitHub Pages shows its running version and that version's updated-at date and local time, with seconds and a labelled timezone, on its initial screen before navigation, settings, About, or authentication. Both values come from provenance bound to the running artifact, never launch time, a file timestamp, an agent's clock, or a hand-entered label, and missing provenance shows an honest unavailable state.

## Current support and configuration

Artifact provenance support is integrated; new initial-screen and site provenance evidence remains pending.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Show build-bound version/time with seconds/timezone before navigation, and an honest unavailable state when absent.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](front-provenance.yue.md).
