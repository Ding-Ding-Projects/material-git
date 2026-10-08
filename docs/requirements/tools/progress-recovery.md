# Progress where it started, recovery where it broke

Public feature identifier: `progress-recovery`. Category: **tools**.

## Required behavior

A dialog that starts a long operation shows that operation's real progress inside the dialog, disables its submit control, denies re-entry in the handler, and offers slow optional phases as an explicit choice that names what declining leaves undone. Where an operation can hit a bug or failure the person cannot diagnose, recovery sits beside the control where it surfaced, and a hand-off to a local coding agent names the real situation and forbids work-losing remedies such as force-pushing. A denied credential or missing scope offers re-authentication on the spot.

## Current support and configuration

Native reviewed operations and bounded output/cancellation exist. Every new action needs inline progress and recovery.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../coverage/git-actions-audit.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Domain `saving` state blocks submit reentry and exposes actual pending work through the shell. Failed apply clears the review receipt before retry. A conflict, permission denial or partial remote effect must retain its specific recovery state; a generic success toast cannot replace verification.

## Failures and remaining work

Prevent handler reentry, preserve partial results and offer re-authentication or safe recovery beside the originating control.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](progress-recovery.yue.md).
