# Repository and linked working tree management

Open Source Control with **Open repository**, or use **Create repository** and **Clone repository** to review a new native-selected destination. Existing folders are never overwritten. Clone depth, partial clone and single-branch choices remain explicit. These workflows retain the main-process grant for the selected repository; the renderer cannot supply an arbitrary working directory.

## Inspect and open a linked working tree

**Working trees** lists each registered path, branch or detached state, HEAD, lock reason, stale-registration reason and changed-file state. Missing, symbolic or unrelated replacement directories remain visible with an unavailable explanation. Paths use NUL-delimited Git porcelain, including spaces, Unicode and line breaks. List search has its own adjacent regex builder.

**Open working tree** opens that exact registered row after checking its repository membership again. It does not reopen a folder picker or silently change branches. Opening is disabled while a task draft is active. A linked working tree has its own index and working files while sharing object storage, branches and stashes with the primary repository.

## Create, move, lock and repair

**Add working tree** chooses a native parent and a fresh folder name. Select an existing branch, create a new branch from an explicit starting revision, or choose detached checkout. New-branch and detached modes are mutually exclusive. The destination parent identity and vacant destination are checked again before applying. Open the result and use **Maintenance > Sparse checkout** when selected directory cones are needed.

**Lock** accepts a reason for a linked directory that must remain registered while unavailable. **Unlock** is separate. **Move** uses a fresh native-selected destination and preserves the selected directory contents. Git refuses unsupported submodule layouts and locked working trees.

**Repair moved working tree** selects the directory at its new location. Its regular `.git` file must point into this repository's administrative `worktrees` directory, the common-directory connection must match, and the previous directory must be missing. The review binds both native directory identity and administrative file contents. Ambiguous ownership or changed links stop the operation. **Repair links** remains available for an already registered, accessible row.

## Remove or prune safely

**Remove working tree** refuses the active and primary directories, locked or detached working trees, ongoing Git operations, changed files, untracked files and ignored files. Sparse and assumed-unchanged index states also require separate inspection. The selected HEAD must be integrated into the active HEAD and reachable from an existing remote-tracking upstream. Missing ancestry or publication evidence stops removal. No force option is available. The branch and shared stashes are retained.

Upstream evidence is local: a recorded remote-tracking reference is not a fresh server read. Fetch the selected remote separately when current server evidence is required. No network request or publication occurs as part of removal review.

**Prune missing working trees** first runs Git's dry-run and displays its exact administrative removal preview. An empty preview has nothing to apply. The reviewed registration list, directory identities and lock state must remain unchanged. Pruning stale administrative registrations does not delete working directories or branches.

All working tree reviews expire after five minutes and are single-use. Cancellation before apply changes nothing. Cancellation or failure during a Git mutation can leave partial effects; refresh and inspect before continuing. Native Git protections remain enabled. Application mutations sharing a common object store exclude one another; external Git processes can still change state, so freshness checks run immediately before the mutation.

## Repository overview and recovery

**Maintenance > Inspect repository > Repository overview** reports actual root and metadata layout, current branch and HEAD, changed paths, active operation, shallow and sparse state, configured remotes, local upstream divergence, object counts and storage sizes, and executable configuration discovered by the trust inspector.

The overview suggests the relevant next workflow: preserve changes, finish an active conflict operation, deepen incomplete history through a separate review, inspect integrity, or retain a recovery branch from the reflog. It performs no repair, fetch, prune or maintenance, and it does not certify object integrity. **Integrity check**, **Recovery log** and reviewed maintenance tasks remain explicit actions.

Native subprocesses disable automatic lazy fetching so a local inspection cannot silently download promised objects. A missing promised object is an inspection failure that requires an explicit remote workflow. Trust for hooks, filters, signing and credential programs remains a separate choice.

## Verification boundary

Native regression fixtures use disposable repositories, local bare origins and linked working trees. They cover exact-row opening, missing registrations, preservation, removal refusal, stale reviews, parent replacement, symbolic replacement, moved repair and shared mutation exclusion. A focused Chromium interaction test drives the genuine Material controls against the real native service. This component evidence does not establish Windows installer behavior, live remote access or the complete application theme/language/display-scale capture matrix.
