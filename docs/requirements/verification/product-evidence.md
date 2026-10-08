# Real screenshots wherever a surface is described

Public feature identifier: `product-evidence`. Category: **verification**.

## Required behavior

Every README and GitHub Pages carries real screenshots of every surface that has one, the main screen, each destination, settings, editors, dialogs, empty and issue states, the narrow layout, and both themes, grouped under collapsible headings with alt text naming what each shows. They come from the real built artifact through the project's own harness at a known commit, never from mockups, and documentation articles and interface-changing release notes follow the same rule. Visual tasks retain inspected, provenance-bound screenshots in the repository's evidence folder, and a surface that cannot be captured yet says so where the image would go.

## Current support and configuration

Earlier captures prove earlier surfaces only. Root is replacing them after the domain remake.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: partial**. See [implementation reference](../../local-verification.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Capture every new destination/editor/dialog/empty/error/narrow/theme state from final artifact with commit/hash ledger.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](product-evidence.yue.md).
