# One detailed article per feature on the GitHub Pages

Public feature identifier: `feature-articles`. Category: **documentation-site**.

## Required behavior

The documentation lives on the GitHub Pages, not only in the repository: every feature has its own detailed article covering behaviour, configuration, issue modes, security, and verification, ending with suggested articles so no reader hits a dead end. Articles and the GitHub Pages itself are updated in the same project-changing task that changes the behaviour, and long pages use navigable sections rather than one long scroll.

## Current support and configuration

Per-feature source articles are being added with explicit status. Site bundling/publication and full Cantonese review are pending.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: unknown; repository: not-applicable**. See [implementation reference](../../requirements/README.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify each article appears on site with behavior/configuration/failures/privacy/checks and suggested links.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](feature-articles.yue.md).
