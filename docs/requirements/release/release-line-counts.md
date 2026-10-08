# Line counts counted by GitHub Actions

Public feature identifier: `release-line-counts`. Category: **release**.

## Required behavior

Every GitHub release states the project's line count at that tag, produced by the release workflow running the repository's committed counter script, with the command recorded. The table separates source, tests, and styles or markup with total and non-blank lines, states exclusions, separates generated files, attributes surviving lines to agents and people with `git blame` under a stated rule, gives project and grand totals, and agrees with itself. agents never count lines by hand, and the README copy is refreshed only from a published release.

## Current support and configuration

A published workflow-generated source/test/style and authorship count is not verified by this audit.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../README.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Use committed counter at tag with exclusions/generated separation; refresh README only from verified publication.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](release-line-counts.yue.md).
