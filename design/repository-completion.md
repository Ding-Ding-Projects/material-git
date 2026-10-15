# Repository completion workspace

The production component is `src/renderer/repository-finish.ts`, using the application's registered Material Web controls. It accepts native-opened repository choices and a typed native service callback. Its owning route is `repository-operations`; the application shell owns routing, settings and bridge wiring.

The workspace has three explicit stages: select and inspect repositories, review branch preservation and exact cleanup choices, then execute the reviewed batch. Repository settings and diagnostics remain adjacent to their branch choices. The component uses independent search state with the shared regex workbench. Every branch requiring preservation has its own commit message. Cleanup requires separate ownership, inactivity and exact removal controls.

Progress is organized by repository. Each job exposes its state, current step, independent cancel action, partial-effect warning, verified archive location and expandable journal. A batch-wide cancel affects remaining work without hiding completed results. Recovered journals expose a new-review action rather than replaying stale receipts.

All authored task labels and review instructions have English, Cantonese and bilingual renderings. Native paths, branch names, hashes and Git diagnostics remain literal. Layout uses a single responsive column with wrapping action rows and bounded diff/journal scroll areas. Keyboard focus uses native Material controls and native `details` summaries. Status and error regions are announced to assistive technology.

Screens/states: empty native selection, selected repositories, native inventory, preservation messages, ownership/inactivity choices, exact review, running, completed, partial failure, cancellation and restored journals. The baseline is 1200×900; the intended minimum is 800×600. Themes inherit application Material tokens. No generated assets or third-party image references are introduced.

`tests/repository-finish.browser.mjs` builds the actual component and native service for an isolated Electron fixture with local bare remotes. It records native captures after each workflow click and source/artifact hashes under ignored `test-results/repository-finish`. This component proof is separate from the integrated application navigation and complete normal/minimum viewport, language, theme and display-scale matrix, which remain final integration responsibilities.

Independent source review requested the checked-out default branch remain untouched; the implementation and native regression enforce that rule. Further integrated interaction and visual review must use the final combined application artifact.
