# Material component provenance

The desktop workspace imports the official `@material/web` package pinned to version 2.5.0. Its registered `md-*` buttons, dialogs, text fields, selects, switches, sliders, tabs, chips, lists, progress indicators and icons implement the controls. Lit 3.3.2 registers three composition elements: `mg-surface` for shape, elevation and containment, `mg-text` for typography, and `mg-layout` for responsive arrangement. Their generic HTML exists inside the composition internals. Generic `div` elements in official control templates are the documented slots of Material select and list items, not substitute controls.

`mg-search` is a registered composition of official fields, buttons and selection controls. Every instance owns its query, expression, flags, anchored builder and worker. The worker is terminated on timeout or teardown. Pattern syntax errors and timeouts remain local to their builder.

The application uses real bootstrap metadata, command definitions, entity choices and operation events from the main process. The renderer contains no sample repositories, command results or forged account status. Unknown command metadata is not presented as exhaustive CLI coverage. Interactive command limitations are displayed beside the command.

Desktop GUI interaction and design parity captures are not available in this execution environment. Source tests and successful compilation do not establish real graphical interaction, accessible control anatomy, visual parity or packaging behavior. No design reference or capture is fabricated. This document is a provenance audit, not a visual reference screen.
