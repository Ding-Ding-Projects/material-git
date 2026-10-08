# Workspace, tabs and records

Material Git stores tab order, pinning, groups, collapsed groups, docking edge, panel visibility and sizes, split layout, and palette size on this device. The tab strip defaults to the left edge. Its manager offers left, right, top and bottom docking. Narrow side strips collapse to named compact controls. Input drafts stay in memory and are never included in a saved workspace, export or local Git snapshot.

Open a workflow or feature page, then use its tab. Drag tabs to reorder, or focus a tab and press Alt+Shift+Arrow along the strip axis. Ctrl+Shift+P pins or unpins a tab. Arrow keys follow the docking axis; Home and End jump to the ends. Manage tabs opens the full searchable overflow list, with ten matching tabs per page. Current-strip, master, group-name and per-group tab searches have independent regex builders.

The manager creates, renames, colors, orders, pins and collapses groups. Move… into group… opens a searched destination picker; removing a group keeps its tabs. Closing other, following, group or all tabs protects pinned tabs by default. Text and inverse text bulk closes use the same regex predicate and show affected titles before closing. Edited inputs require a separate discard decision. Running operations continue after a task tab closes. Closing or restarting the application retains all feature work guards.

Split view shows a separately browsable offline documentation pane beside the current work. The divider supports pointer dragging and keyboard arrows, Home and End. Close split view to return to a single pane.

Ctrl+Shift+F opens the command palette. It finds destinations, settings, documentation articles and controls on the current page. Settings render editable controls that use the same settings bridge. Selecting a control opens its owner, focuses it and highlights it. Palette card or full-window size persists.

The notification centre retains up to 500 sanitized notification records across restarts. Mark read or unread, dismiss, restore and export individual or selected matching records. Errors retain their detailed text in the active session; durable records contain a generic attention message rather than raw provider output. Shift-click or Shift+Space extends selection. Select this page and Select every match have explicit scopes.

Workspace history records complete validated metadata snapshots in an isolated local Git repository under the application data directory. It never writes to a user's repository. Search, date and actual-action filters compose. Compare shows changed fields; restore appends a new revision and can be undone by restoring the later revision. Label revisions, export matching records and review retention pruning. Git failures preserve the requested change and show a warning. Credential records and drafts are not workspace snapshots.

Export and import records uses the bounded version 1 `material-git-records` UTF-8 JSON envelope. Workspace and notification records can be re-imported after validation and a complete preview. Unknown fields, malformed records, token-like strings, duplicates and missing groups reject the whole import. Revision exports are read-only audit records. Workspace import replaces saved metadata while keeping current drafts in memory. Notification import replaces that collection. JSON faithfully carries the nested metadata; flattening it to a table would lose structure.

Documentation is bundled from every Markdown article at build time and works offline. Its search covers titles and body text. Relative article links stay in the app; reviewed external HTTPS links use the native bridge. The build guard verifies every article title and identity appears in the renderer bundle. About shows the current display name, version, and actual build timestamp; an unavailable timestamp is stated explicitly.

Verification: `tests/workspace.test.ts` checks restart fixtures, strict imports, credential exclusions, bounds and append-only restores. `tests/workspace.browser.mjs` drives registered components in the built Electron interface using isolated profiles and genuine captures. The app shell owns domain-page navigation and integration.

[Authentication](authentication.md) · [廣東話版本](workspace.yue.md)
