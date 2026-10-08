# GitHub accounts and permissions

The Accounts destination manages the GitHub identity used by future commands. It reads real account status from the bundled GitHub CLI and displays only selected metadata. It never exposes a token, raw authentication output, or saved credential contents. Hosts come from the main-process allowlist; arbitrary hostnames and shell commands are unavailable.

## Sign in and refresh permissions

Sign in requests GitHub CLI's standard `repo`, `read:org`, and `gist` scopes, plus any additional permissions selected in the panel. Each additional permission has a description explaining its purpose. Sensitive permissions such as repository deletion and billing management are named explicitly; no extra permission is selected automatically. Additional permissions and the refresh review each have their own search with the adjacent regex workbench and twelve choices per page. Search matches permission names and descriptions. Selected permissions remain selected across searches and pages, and the selection summary names every chosen permission before authorization. Permission checkboxes, reset, removal choices, and the required review acknowledgements have explicit accessible names.

For an active saved account, **Review permissions** opens a review containing the account, host, requested additions, requested removals, and the effects of the change. With no additions or removals, `gh auth refresh` preserves previously added scopes. Reset requests the default minimum scopes instead; reset cannot be combined with individual changes. The minimum `repo`, `read:org`, and `gist` scopes cannot be removed. Refreshing another account requires switching to it first. Environment-token accounts cannot be refreshed by this workflow.

After review, the app runs the pinned CLI's `auth refresh` with structured flags and no shell, reusing the transient device-code flow. Open the approved GitHub page, enter the temporary code, complete authorization, and return to Accounts. Device codes disappear after completion or cancellation; stale process output cannot restore them. Status is read back after authorization and the expected active account is checked before success is reported. Reported scopes remain the factual GitHub response; the app does not claim unreported permissions or force a token reveal.

## Connect Git authentication

For the active authenticated saved account, **Connect Git authentication** reviews a change to global Git configuration. Confirming runs `gh auth setup-git --hostname=<approved-host>`. It does not use `--force`, configure unknown hosts, or change every authenticated host implicitly. The host-specific helper is read back with `git config --global --get-all credential.https://<host>.helper`; the expected CLI helper must appear as the final configured helper before the panel reports verified setup.

This replaces the host's existing global credential-helper configuration and affects Git commands outside Material Git. Repository-specific configuration can override the global helper. Readback proves that the expected configuration was stored, not that a clone, push, network request, or future authentication has succeeded. If setup succeeds but readback fails, the panel reports that configuration may have changed and asks the user to inspect it before retrying. The app does not silently roll back unrelated Git settings.

## Account switching and limits

Switching and local removal retain their review and account readback checks. An environment token can override saved accounts, so the panel refuses to claim that switching bypassed that credential. Local removal does not revoke the token on GitHub.

Injected-process tests verify flag construction, confirmation, host restrictions, permission constraints, transient device state, cancellation, environment-token restrictions, setup readback, and failure states. Tests do not mutate live credentials or Git configuration. Completed browser authorization, operating-system credential storage, Windows helper configuration, accessibility, localization, and every API permission remain separate integration obligations. Token export is deliberately unavailable.

## Remaining command parity

The generic command catalog still has dedicated-workflow exclusions for Codespaces SSH/editor/notebook launch, extension installation/execution/upgrade, Copilot, alias import, and the preview prompter. Command metadata alone does not implement those adapters. REST/GraphQL schema coverage similarly does not prove reachable GUI execution, account permissions, or successful operation against a live service. Keep these gaps explicit until each workflow has implementation and built-application evidence.
