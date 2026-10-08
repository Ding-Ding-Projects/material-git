# External editor and VS Code hand-off

Public feature identifier: `external-editor`. Category: **tools**.

## Required behavior

Every application that owns files or projects detects installed editors, lets the person add or choose one, persists the choice, opens the project folder or a file, and degrades with a clear message when none is found. Anything the application can export opens in Visual Studio Code in one action, as a workspace root for folders, with detection of `code`, per-user, machine, Insiders, and portable installs and an honest download offer when it is absent.

## Current support and configuration

Selected approved external editor/Jupyter and export handoffs exist. Universal export-to-VS-Code/editor discovery coverage remains open.

This is a scoped implementation assessment, not a claim that the whole requirement is finished. Surface states: **app: partial; site: not-applicable; repository: not-applicable**. See [implementation reference](../../cli-workflows.md) and the [complete inventory](../../coverage/features.json). Controls belong in the destination that owns the data; the primary UI must remain a productive task workspace.

## Failures and remaining work

Verify installed variants/portable launch, persisted choice, missing launcher and real folder/file opening on supported platforms.

Missing native dependencies, OS facilities, remote permissions and verification are reported separately. Disabled or unavailable behavior must explain the actual cause and preserve the existing data; no sample entity or fake success fills an empty state.

## Privacy

Personal vocabulary mappings, credentials, authentication headers, private keys and raw environment values never enter ordinary exports, history, logs, captures or public documentation. Local records use bounded versioned schemas; any sensitive export requires its dedicated reviewed flow. For an external/service requirement, only presence/status evidence is recorded.

## Checks

Inventory integrity is tested independently from feature behavior. Close this row only after feature-specific source/validation review, persistence and negative-regression checks, final built GUI interaction and genuine capture at the same revision. Linux evidence does not prove Windows installation or credential-storage behavior. Article translation is separate from complete app/site localization and live interface verification.

Suggested articles: [requirements index](../README.md) · [GitHub actions audit](../../coverage/github-actions-audit.md) · [Git actions audit](../../coverage/git-actions-audit.md) · [Cantonese article](external-editor.yue.md).
