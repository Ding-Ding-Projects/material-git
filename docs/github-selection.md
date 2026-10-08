# Selected issue and pull request identity

When you choose an issue or pull request from a real provider list, the desktop uses its visible repository number for detail and task endpoints. Its provider database identity travels separately so the native service can check that the selected record is still the same one. Database IDs are not substituted for the number shown in the repository.

## Work from the selected record

1. Select the intended host and repository, then load the issues or pull requests list.
2. Choose the real row you want to inspect or act on.
3. Open its detail or contextual task, and check the repository and record shown in the editor.
4. For a mutation, review the actual operation before applying it.

The selected task retains its host, repository, visible number and available provider identity. An unavailable or invalid visible number asks you to refresh the list instead of guessing an endpoint. A selection from merged-pull-request search can carry an issue database identity because GitHub search returns issue-shaped records; the native check respects that entity kind while the task still uses the pull request number.

## Stale selections and reviews

When a provider identity accompanies the selection, the native service re-reads the corresponding issue or pull request record and compares its database ID and visible number. A mismatch stops the request and asks you to refresh and select the record again. This check covers detail access, contextual tasks and the provider target included in mutation review.

Applying a reviewed mutation rechecks the active account, prepared task and provider target. Changed selection identity, account or target state requires a fresh review. Apply accepts only the reviewed identifier and confirmation; it cannot replace the reviewed values with another target. Remote permissions still determine whether a valid request can succeed.

These checks do not create a record, supply a missing permission or make a stale row current. Refresh the actual list, inspect the returned record and review again when the application reports that the provider target changed.

## Verification and limits

The visible-selection hardening was introduced in `5b822458`. `tests/github-selection.test.ts` exercises the native service with controlled provider responses. It checks distinct visible numbers and database IDs, issue-shaped merged-pull-request search results, expected detail endpoints, and rejection of a changed identity before a mutation request. A separate controlled case verifies a reviewed pull-request mutation uses the number-based endpoint after identity validation.

`tests/github-selection-render.test.ts` bundles the actual Material issue and pull-request workspace. It selects fixture rows through the compiled interface, opens Close, requests review, and verifies that detail/review payloads preserve the number, provider identity, entity kind and host. It checks that no Apply request was made and that the browser reported no page errors.

Those results establish native validation and compiled selection/review behavior with fixtures. They do not establish live GitHub write permission, a mutation against the public repository, Windows installation or full action parity. The existing `e464ff70` gallery predates this hardening and must not be relabelled as its evidence. The recorded Windows installer baseline also remains independent of these newer source changes.

The website publishes these articles and links to the desktop workflows. It does not authenticate a provider account or execute provider mutations. Credential values remain outside ordinary article exports, history and capture records.

Suggested articles: [GitHub task workspaces](github-tasks.md) · [authentication](authentication.md) · [security and permissions](security.md) · [Cantonese guide](github-selection.yue.md).
