# GitHub Actions dependency or prerequisite bootstrap and safe outputs

Public feature identifier: `ci-bootstrap`. Category: **release**.

## Required behavior

Every GitHub Actions job keeps an explicit dependency or prerequisite inventory beside its workflow, checks before installing, bootstraps anything missing from canonical sources into job-local cacheable locations, and stops at the exact step naming the missing dependency or prerequisite. Each repository proves the cache-miss path from a fresh environment against a hand-written list of every job. Every job that can produce an artifact collects and uploads its safe outputs under `if: ${{ always() }}` without masking the original bug or failure.

## Current support and configuration

Workflow dependency bootstrap exists. Every-job fresh cache-miss inventory and always-uploaded safe outputs need run evidence.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Prove each prerequisite and failure location, upload safe artifacts without replacing original failure.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](ci-bootstrap.yue.md).
