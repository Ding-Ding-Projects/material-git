# Material component provenance

The desktop workspace imports the official `@material/web` package pinned to version 2.5.0. Registered `md-*` buttons, dialogs, fields, selects, switches, sliders, tabs, chips, lists, and progress indicators implement its controls. Generic `div` elements in their templates provide the documented Material select and list slots.

Lit 3.3.2 registers local compositions for the desktop shell. These compositions use Material color, typography, state, shape, and motion tokens; they are not upstream Material Web components. Registration alone does not establish Material anatomy. Ordinary actions retain the official button, icon-button, field, select, list and dialog implementations and their default shapes. Shared scalable typography roles replace compact legacy label overrides. Layout rows grow around controls rather than imposing the former 29/32px action heights. Navigation uses rounded selected containers and 56px comfortable rows (48px compact). Generic surface compositions use medium 12px shape by default, while explicit saved appearance preferences remain user-owned:


| Composition | Purpose |
| --- | --- |
| `mg-surface`, `mg-text`, `mg-layout` | Containment, typography, and layout |
| `mg-icon` | Icon presentation adapter; asset provenance is recorded separately when official assets are integrated |
| `mg-splitter` | Pointer and keyboard resizing with separator semantics |
| `mg-scroll` | Native scrolling viewport with accessible custom vertical and horizontal scrollbars |
| `mg-search` | Official controls composing an isolated search and anchored regex workbench |
| `mg-workspace-tabs` | Application-specific grouped, pinned and dockable document tabs; not an upstream Material tab component |

The window is organized around destination navigation, persistent task tabs, domain workspaces, and a status bar. The initial workspace is repositories. Accounts are available directly from the context toolbar before sign-in. Local Git, repository records, settings, history, tools and the API explorer retain their existing native bridge and operation paths. Task tabs preserve drafts, keyboard navigation, pinning, groups, docking and dirty-draft close review. This is a productive desktop, not a command catalog.

The custom scrollbar supports thumb dragging, track paging, arrow keys, Page Up/Down, Home/End, horizontal scrolling, live geometry updates, and reduced motion. Remaining native scrollbars inside official controls and registered compositions receive the same Material-token styling through an open-shadow-root installer. This fallback is styled native rendering, not an official upstream Material scrollbar. See [the scrolling contract](../docs/scroll-surface.md).

Each `mg-search` owns its query, expression, flags, snippets, and worker. Regex builders use the browser top layer while remaining anchored to their originating field, so document scrolling does not clip them. Workers are terminated on timeout or teardown. Syntax errors and timeouts remain local to their builder.

The application uses real bootstrap metadata, command definitions, entity choices, and operation events. It contains no sample repositories, forged account status, or fake operation results. Command availability and interactive limitations remain visible. The command catalog is not a claim of complete CLI or GitHub API coverage.

## Design boundary and inventory

[The reviewed design handoff](material-gui-handoff.md) records the source findings, focused screen/state inventory, ownership and viewport matrix. The pinned Material Web package establishes genuine controls, not a blanket claim of Material 3 Expressive conformance. Custom desktop splitters, scrollbars, grouped document tabs and rich functional data remain explicitly identified compositions. Native file inputs hidden behind official action buttons are platform plumbing, not exposed replacement controls.

The shared shell styling applies to startup, destination navigation, repository list/detail, local Git, account access, settings, task tabs, operation records and dialog framing. Individual destination-specific controls still require actual rendered inspection. Structural `mg-layout`, `mg-text` and `mg-surface` wrappers do not convert arbitrary interactive HTML into genuine Material controls.

## Verification boundary

Source tests and successful compilation do not establish real graphical interaction, accessible control anatomy, visual parity, or packaging behavior. The desktop remake is also checked by launching the built Electron application in a headless Linux session with a task-only profile and an empty GitHub CLI configuration, with token environment variables removed. The checks cover navigation resizing, scrollbar interaction, account navigation, real local workflows, theme selection, bounded regex placement, small-window layout, and increased font size. This route does not establish Windows installer or physical input behavior.

Run the source checks with `npm run check` and `npm test`. After building, `node tests/material-controls.browser.mjs` exercises real official control interactions with an isolated tokenless profile. The shell regression `node tests/material-shell.browser.mjs` records actual geometry and screenshots for its declared tuples. The broader `node tests/workbench.browser.mjs` must target the current domain shell; `MATERIAL_GIT_QA_OUTPUT` selects an optional output directory. `node tests/scroll-surface.browser.mjs` checks both scrollbar axes in Chromium, including pointer dragging, track paging, content growth/shrink, and fallback styling. These browser checks are separate from the source unit-test command.

## Focused shell regression

The shared-shell regression captures repositories, accounts and settings at 1420x940 and 760x600 with default English text and 200% bilingual text. It records the actual grid tracks, clipping ancestors, toolbar hit areas, record viewport and source/build hashes, then checks keyboard navigation resizing and reduced motion. This focused matrix is not the full language/theme/display-scale matrix. An enlarged domain header now scrolls with its workspace while preserving a minimum record area, preventing the entire list from collapsing below enlarged controls. Separate control tests own tools and nested editors.

Type checking, the production build and 22 affected renderer/preference/discovery regressions passed during the shell implementation. Final integrated runtime evidence must be regenerated after the independently developed controls and theme changes are combined; source-only success does not close the full conformance requirement.
