# pushed `CLOSEOUT_PROMPT.md`

Public feature identifier: `closeout-prompt`. Category: **repository**.

## Required behavior

Every turn that worked in a repository writes a copy-ready fenced closeout prompt to `CLOSEOUT_PROMPT.md` at that repository's root, replacing the previous copy, commits it on the owning branch, pushes that branch, and proves the Git remote ref with `git ls-remote` before the turn ends. A public repository's copy goes through the canonical sanitizer and the leak scan, and an unchanged prompt makes no empty commit. At resource limit this push is unconditional.

## Current support and configuration

Copy-ready local prompt is committed. No branch push or remote-ref verification is performed by this lane.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: not-applicable; site: not-applicable; repository: partial**. See [implementation reference](../../../CLOSEOUT_PROMPT.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Controls, defaults and limits

`CLOSEOUT_PROMPT.md` is a copy-ready continuation record committed locally. Authorized publishing owner must prove the pushed remote ref. A local file/commit cannot establish branch publication, site deployment or a completed release.

## Failures and remaining work

Root publishing owner pushes the approved checkpoint and verifies remote ref; absence of push proof remains open.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](closeout-prompt.yue.md).
