# Discord status bridge

Public feature identifier: `discord-status-bridge`. Category: **status**.

## Required behavior

The Hub reaches Discord through a bridge that reads the same session projection and writes answers into the same session inbox, so agents poll one inbox and never hold a Discord token. Owner-registered bridge credentials persist on the Hub host's storage and read back as presence only, and the bridge token is read-plus-reply only and must differ from the agent enrollment token. Every surface rule Discord cannot carry is named with its shipped equivalent.

## Current support and configuration

No Material Git implementation or interaction evidence is asserted for this scope.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: not-applicable**. See [implementation reference](../../requirements/README.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Record actual required implementation, permissions, failure behavior and verified evidence before claiming support.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](discord-status-bridge.yue.md).
