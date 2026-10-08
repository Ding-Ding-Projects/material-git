# Universal local file converter

Public feature identifier: `file-converter`. Category: **tools**.

## Required behavior

Every user-facing application and GitHub Pages ships a real local converter that detects type by bounded byte inspection and offers a categorized, searchable adapter catalogue covering at least Documents/PDF, Images, Audio, Video, Archives, Structured Data/Spreadsheets, Code/Text, and Binary Encodings, with unavailable formats listed as visible disabled rows naming the exact missing dependency or prerequisite. An adapter is enabled only when every dependency or prerequisite is bundled and proven offline, runs sandboxed within bounded resources, and validates its output, and the PDF inspect, split, merge, extract, reorder, rotate, and metadata tools write atomically and reopen to verify. Lossy changes are disclosed first, sources stay untouched, overwrites need super confirmation, and the queue has no artificial file cap yet never loads every path or byte into memory, with pause, resume, cancel, crash recovery, and a storage preflight.

## Current support and configuration

Local structured/text/color/time conversion is implemented; universal document/PDF/media/archive adapter coverage is incomplete.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../converters.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Expose unavailable dependencies truthfully; prove byte detection, offline adapters, bounded queues, atomic output validation and crash recovery.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](file-converter.yue.md).
