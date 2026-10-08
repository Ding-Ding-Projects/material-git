# Material component provenance

The desktop workspace imports the official `@material/web` package pinned to version 2.5.0. Registered `md-*` buttons, dialogs, fields, selects, switches, sliders, tabs, chips, lists, and progress indicators implement its controls. Generic `div` elements in their templates provide the documented Material select and list slots.

Lit 3.3.2 registers local compositions for the desktop shell. These compositions use Material color, typography, state, shape, and motion tokens; they are not upstream Material Web components:

| Composition | Purpose |
| --- | --- |
| `mg-surface`, `mg-text`, `mg-layout` | Containment, typography, and layout |
| `mg-icon` | Consistent local SVG line icons |
| `mg-splitter` | Pointer and keyboard resizing with separator semantics |
| `mg-scroll` | Native scrolling viewport with accessible custom vertical and horizontal scrollbars |
| `mg-search` | Official controls composing an isolated search and anchored regex workbench |

The window is organized around a command explorer, task documents, an operation inspector, and a persistent status bar. The initial document is an actionable command list. Task tabs retain drafts, support keyboard navigation, and retain the existing dirty-draft close confirmation. Accounts are available directly from the context toolbar before sign-in. Command forms, cancellation, result export, and destructive review still use the validated main-process bridge.

The custom scrollbar supports thumb dragging, track paging, arrow keys, Page Up/Down, Home/End, horizontal scrolling, live geometry updates, and reduced motion. Remaining native scrollbars inside official controls and registered compositions receive the same Material-token styling through an open-shadow-root installer. This fallback is styled native rendering, not an official upstream Material scrollbar. See [the scrolling contract](../docs/scroll-surface.md).

Each `mg-search` owns its query, expression, flags, snippets, and worker. Regex builders use the browser top layer while remaining anchored to their originating field, so document scrolling does not clip them. Workers are terminated on timeout or teardown. Syntax errors and timeouts remain local to their builder.

The application uses real bootstrap metadata, command definitions, entity choices, and operation events. It contains no sample repositories, forged account status, or fake operation results. Command availability and interactive limitations remain visible. The command catalog is not a claim of complete CLI or GitHub API coverage.

## Verification boundary

Source tests and successful compilation do not establish real graphical interaction, accessible control anatomy, visual parity, or packaging behavior. The desktop remake is also checked by launching the built Electron application in a headless Linux session with a task-only profile and an empty GitHub CLI configuration, with token environment variables removed. The checks cover panel resizing, scrollbar interaction, account navigation, real read-only CLI execution, theme selection, bounded regex placement, small-window layout, and increased font size. This route does not establish Windows installer or physical input behavior.

Run the source checks with `npm run check` and `npm test`. After building, `node tests/workbench.browser.mjs` launches the real Electron application with an isolated tokenless profile; `MATERIAL_GIT_QA_OUTPUT` selects an optional output directory. `node tests/scroll-surface.browser.mjs` checks both scrollbar axes in Chromium, including pointer dragging, track paging, content growth/shrink, and fallback styling. These browser checks are separate from the source unit-test command.
