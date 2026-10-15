# Complete one or more repositories

Use **Complete repositories** to preserve reviewed changes, push source branches, integrate approved contributions into the remote default branch, verify private recovery archives, and optionally remove completed task-owned branches and working trees. Select up to 30 native-opened repositories. The queue runs at most three independent repositories at once.

1. Open each local repository with the native folder picker. Restored tabs need a new native connection after restart.
2. Select the repositories and choose **Inspect selected repositories**. Inspect the actual push destination, remote default branch and commit identity. The destination uses `origin`, or the first configured remote when `origin` is absent. Change remote configuration in the local Git workspace before inspection if this is not the intended destination. Hosting-account identity is not inferred from a URL.
3. Review all branches, linked working trees, dirty files, untracked files and stashes. Enter a preservation commit message for each dirty branch. Explicitly select each source to preserve and push, then separately select which contributions to integrate. No branch is selected automatically. Unselected branches are retained. All selected sources are preserved and pushed before integration.
4. Cleanup is optional. Explicitly confirm ownership and that no session or release process depends on each candidate. The selected working tree, default branch, locked working trees and working trees with ignored files cannot be selected for cleanup. Stashes are always retained.
5. Review the exact plan, confirm it and run it. Progress, cancellation and failures are independent for each repository.

## Recovery and safeguards

The service creates private recovery folders outside the repository, with a manifest, original file modes and SHA-256 hashes. It reads every copied file back before accepting an archive. Each archive contains Git administrative data, including refs, reflogs and stashes, plus tracked and nonignored untracked files from every available linked working tree. Ignored files are excluded, so any working tree containing ignored files is retained. Archives are local only and are never uploaded.

Archive limits are 50,000 files, 256 MiB per file and 1 GiB total. Symbolic links, special files, external alternate object stores and unsupported repository states stop the workflow rather than producing incomplete recovery claims. Large changed files and unreviewable binary additions require a dedicated payload-storage review first. Pending external payload uploads must complete through the application's verified storage workflow before a commit is allowed.

Git hooks, filters, signing, credential programs and custom transports require explicit repository program trust. If untrusted remote inspection fails, the local inventory still shows the exact destination and configured programs. Explicitly trust that configuration and retry inspection. A changed destination or program configuration invalidates the trust fingerprint before any trusted transport is started. Reads use the native Git trust boundary. Normal source and default updates never force-push. Deleting a reviewed remote source uses an exact expected-tip lease so a concurrent remote change is retained.

Each review expires after five minutes and binds refs, worktree registrations, configuration, index entries, dirty file contents and the remote default. Changed or reused reviews are rejected. Repositories sharing one Git object store cannot run overlapping mutations.

Integration happens in a dedicated working tree. Existing checked-out default branches stay unchanged; the result reports the remote integration commit so a later separately reviewed fast-forward can update that checkout. An unoccupied local default reference is advanced only by a reviewed compare-and-swap. Cleanup additionally verifies that every source tip is an ancestor of the exact pushed default commit.

A conflict preserves the integration working tree and source commits. Cancellation terminates the owned native process group and reports attempted or partial effects. Neither case rolls back completed commits or pushes. The saved journal is available after restart; reconnect unfinished repositories and inspect a new review before resuming. A resume never blindly replays old mutation steps.

## Verification scope

Native integration tests use disposable local bare origins, including full preservation/integration/cleanup, conflicts, stale index reviews, duplicate repository grants, cancellation, ignored-file retention, remote-tip races and bounded multi-repository execution. The Electron fixture drives the actual component and native service. It does not establish hosted-account permission, Windows installer behavior or a complete application navigation and display-scale matrix.
