# repository operational skill

Public feature identifier: `operational-skill`. Category: **repository**.

## Required behavior

Every release-grade shutdown pass generates or refreshes one repository-specific operational skill recording the real build, packaging, full-UI drive, per-click screenshot, evidence, verification, release, and recovery routes, so a later agent or implementation subagent can reproduce them without rediscovery. Private workflow content belongs in the canonical private skill catalogue and any project-local mirror is sanitized. The skill is validated through the skill-creator workflow.

## Current support and configuration

Public reproducible build/audit routes are documented; skill-creator validation of a repository-specific operational skill is not evidenced.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../AGENTS.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Create/validate the actual canonical skill with real UI/capture/release/recovery routes and sanitize any local mirror.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](operational-skill.yue.md).
