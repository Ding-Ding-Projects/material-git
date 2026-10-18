# Ignore builder interaction and integration contract

The repository owns this design. The renderer is a registered `mg-git-ignore` Material Web composition using official buttons, fields, chips, switches, lists and progress, plus the existing registered layout, surface, typography, icon and search compositions. It is a productive editor with explicit preview and save actions.

The owning repository supplies `worktreeId`, `settings` and a typed `GitIgnoreClient`. `GitIgnoreService.handle` accepts `read`, `preview`, `save` and `discard`; `dispose` ends its lifecycle. The main process resolves every grant through the native Git service and supplies its bounded, argument-array Git runner. Save belongs under the application's common-repository mutation lock.

`git-ignore-work-state` reports dirty and busy state with the exact working-tree identity. `discardDrafts()` refuses while busy, releases the pending native review and restores the loaded file. The host must preserve the editor under its repository owner, aggregate its state for close review, record an explicit discarded draft through the normal history contract, and call this public method only after that review. `git-ignore-saved` tells the host to refresh source-control state.

Inventoried states: missing native context, loading, loaded empty file, populated rules, template filter, pattern builder, rule search with invalid regex, editable ordered draft, native preview, match search, expired or stale review, successful save and service error. Preview uses the actual current worktree for before matches and a bounded isolated native Git tree for proposed matches, including ancestor precedence, directory semantics and excludes. Tracked status is read from the real index.

Keyboard access uses the official controls and the existing search workbench. Each collection has a separate search identity and regex state. Rule rows and match results paginate in sets of 20. Layout wraps at the minimum viewport; switch-label pairs stay together. The target verification tuples include 1420×940 and 760×600, English/Cantonese/bilingual, light/dark and 100/125/150/200% Electron zoom. A tested component tuple does not establish the complete product matrix.

The source integration test preserves raw native captures with image hashes and source-file hashes. Final application screenshots must be refreshed after central IPC and repository-tab integration. Screenshots of user files can contain private comments and names and need a separate publication review.

Focused search audit found remaining collections in download queues, pack-object rows, advertised references and comparison selections. Their owners must add independent searches with truthful current-page or complete-result scope. The ignore builder does not silently alter those separately owned surfaces.
