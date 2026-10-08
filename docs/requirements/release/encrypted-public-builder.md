# Encrypted public builder for private repositories

Public feature identifier: `encrypted-public-builder`. Category: **release**.

## Required behavior

Private repositories build and release through the `encrypted-public-builder` skill: a gibberish-named public builder holds only an encrypted, name-free payload behind opaque per-project ids, releases publish only back to the private repository, and the private source keeps `.github/workflows` absent. No public location ever reveals the private repository's name, products, build details, or release target. An unavailable builder is an exact blocker, never a fall back to an unencrypted installer.

## Current support and configuration

This is a public source repository; private-repository encrypted builder rules do not apply.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: not-applicable**. See [implementation reference](../../build.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

If source becomes private, reassess encrypted-only public payload and release privacy before any build.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Cantonese draft articles below do not certify complete app/site localization.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese draft](encrypted-public-builder.yue.md).
