# A real release on every push

Public feature identifier: `release-workflow`. Category: **release**.

## Required behavior

Every GitHub project has a GitHub Actions workflow on every `push` and `workflow_dispatch` that builds, packages, and publishes exactly one new, uniquely tagged, non-draft GitHub release carrying the genuinely built installer, and by user's standing decision it runs no tests, lint, or other gating gate. Release notes state which checks actually ran locally and their real results, never describe an ungated release as passing, and publishing creates no automation loop. The active delivery scope is Microsoft Windows only, and GitHub API calls resolve the `RELEASE_TOKEN`, `ORG_TOKEN`, `GITHUB_TOKEN` chain without ever printing it. A private repository keeps `.github/workflows` absent and reaches the same release through `encrypted-public-builder` instead.

## Current support and configuration

Push/manual release workflow builds unsigned Windows artifacts; no CI tests/lint are claimed.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Release owner verifies actual successful run, unique nondraft release, exact source/artifact and local-check disclosures.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](release-workflow.yue.md).
