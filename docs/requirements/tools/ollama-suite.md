# Universal local Ollama suite manager

Public feature identifier: `ollama-suite`. Category: **tools**.

## Required behavior

Every user-facing application and GitHub Pages independently ships a complete Ollama manager over Ollama's documented local HTTP API, fully guided inside the product with real pickers, recommended defaults, explanations, and an offline troubleshooter, and never a "see online docs" dead end. Its Model Store enumerates the whole official catalogue and every tag at each verified refresh, hardware fit gives every variant an evidence-backed **Runs well**, **Runs with limits**, **Unlikely**, or **Unknown** verdict, and the cart means batch pull only, never a payment. Chat is a full local session surface with capability-gated attachments, and launching a local harness profile is allowlisted orchestration with preflight, preview, snapshots, one-click restore, and automatic rollback, never an arbitrary shell.

## Current support and configuration

Native model catalogue crawling, hardware evidence, reviewed persistent pull batches, stored streaming chat sessions and allowlisted harness lifecycle are integrated. Full live catalogue/tag/GPU/attachment/platform proof remains incomplete.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../ollama.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

Catalogue pages default to `40` rows (`1`–`100`); discovery permits at most `10000` official pages. A reviewed pull batch accepts `1`–`100` exact tags and parallelism `1`–`3` (default `1`). Streams cap at `8` MiB; saved sessions cap at `500`, with `128` messages and `1` MiB per session. GPU backend compatibility remains unverified even if telemetry reports VRAM; fit can truthfully remain Unknown.

## Failures and remaining work

Audit complete API action mapping, attachment capabilities, cancellation, stored secrets, offline troubleshooting and rollback.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](ollama-suite.yue.md).
