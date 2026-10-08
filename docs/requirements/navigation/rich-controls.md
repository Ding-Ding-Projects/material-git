# Rich controls wherever a value is shown

Public feature identifier: `rich-controls`. Category: **navigation**.

## Required behavior

Wherever a value is shown, in list rows, table cells, menu items, search results, detail panels, cards, and previews, the real control is preferred over a printout, wired to the same validation, persistence, localization, funny-level styling, history, and accessible naming as its originating surface. A plain readout is allowed only for a named reason, with the full control one obvious action away. Long lists stay virtualized and cheap to traverse, and every embedded control has its own accessible name, role, value, state, focus, and target size.

## Current support and configuration

Dedicated domain forms and schema controls use typed pickers. Not every displayed value is a live rich control.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../api-explorer.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Audit results/table/menu/detail values, native validation reuse, focus and long-list performance.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](rich-controls.yue.md).
