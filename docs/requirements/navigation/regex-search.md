# Regex builder on every search surface

Public feature identifier: `regex-search`. Category: **navigation**.

## Required behavior

Every project includes a super-advanced regex workbench for construction, explanation, testing, profiling, and debugging against its real engine, inside its natural primary interface. Every search bar, settings or properties surface, page, panel, list, table, tree, gallery, history, notification centre, editor section, dropdown, and context menu has its own local search with its own adjacent anchored builder, owning isolated query, pattern, flags, validation, mode, history, and snippets, with plain text as the default. Evaluation stays local, bounded, time-limited, and safe against catastrophic backtracking, and a hand-written per-surface search inventory keeps a missing field from disappearing.

## Current support and configuration

Bounded local regex workbench and per-search component exist. Universal search coverage in the rebuilt UI is incomplete.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../regex.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Audit each list/tree/editor/dropdown/menu for isolated query/builders, profiling, timeout and catastrophic-pattern safety.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](regex-search.yue.md).
