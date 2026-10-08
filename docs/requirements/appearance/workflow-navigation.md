# Workflow navigation and window chrome

Public feature identifier: `workflow-navigation`. Category: **appearance**.

## Required behavior

Content is separated into discrete destinations a person navigates to instead of one long scrolling surface, and every element presented as navigable, from window controls to overflow buttons and decorative navigation, performs its labelled action. Microsoft Windows desktop applications use a frameless window with a custom Material Design 3 title bar and working window controls, never the operating system's default title bar as product chrome. This id groups the navigation-structure duties of the linked sections, while `tabs` carries the tab strip itself.

## Current support and configuration

Integrated domain shell replaced the primary command catalog; source control is being added as a separate natural task workspace.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: unknown; repository: not-applicable**. See [implementation reference](../../coverage/github-actions-audit.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

The shell routes live domains to `mg-github-workspace`, local Git to `mg-git-workspace`, and APIs/settings/accounts to dedicated components. Bootstrap supplies account/repository/build context. Global operation streaming is distinct from per-domain reviewed mutations; navigation never acts as authorization.

## Failures and remaining work

Capture and drive every navigation/window control at final revision; no catalog, marketing hero or generic form may substitute for a domain.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](workflow-navigation.yue.md).
