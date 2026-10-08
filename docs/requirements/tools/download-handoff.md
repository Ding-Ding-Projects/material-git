# Browser-extension download hand-off surfaces

Public feature identifier: `download-handoff`. Category: **tools**.

## Required behavior

A browser-extension download capture opens a real **Start download** dialog naming the file, source, destination, and starting action before any transfer, then a distinct IDM-style **Downloading** surface whose controls operate the real transfer, then a non-blocking **Download complete** surface. Start and completion stay always on top until resolved, and none of them claims success before the transfer ends.

## Current support and configuration

Native bounded archive/log/artifact download tasks were added; browser-extension capture/start/downloading/complete workflow is absent.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: open; site: not-applicable; repository: not-applicable**. See [implementation reference](../../coverage/github-actions-audit.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Implement actual transfer states, resumable/cancellable progress and no early-success claim where this product captures downloads.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](download-handoff.yue.md).
