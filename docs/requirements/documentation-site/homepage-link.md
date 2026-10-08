# The GitHub Pages linked from the repository

Public feature identifier: `homepage-link`. Category: **documentation-site**.

## Required behavior

Every public repository application sets its GitHub About website field (`homepage`) to the exact verified deployed GitHub Pages home-page URL; private repositories are exempt from this mandatory field, and optional private GitHub Pages sites remain allowed. Set the field with `gh repo edit --homepage <url>` and link it near the top of the README. GitHub Pages publishing is enabled whenever the project publishes through it, and the URL and base path stay configurable and verified in the built output, so a detached fork publishing under a project path does not 404.

## Current support and configuration

README links the exact site URL. Repository About homepage PATCH returned HTTP403 due credential metadata permission.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: blocked; repository: blocked**. See [implementation reference](../../../README.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

The exact desired homepage is `https://material-git.earlyray.chatgpt.site`. The README link is present; the connected credential's repository About PATCH returned `HTTP 403`. No source edit changes that permission result or the site's owner-private audience.

## Failures and remaining work

Release owner must resolve authorized permission and verify About URL; site owner-private audience remains unchanged.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](homepage-link.yue.md).
