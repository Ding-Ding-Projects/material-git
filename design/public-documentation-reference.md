# Public documentation experience design handoff

## Status and evidence boundary

This is a design and implementation handoff based on source inspection. It is not a prototype, a built result, a browser verification, a capture, or proof of deployment. No screenshots were taken for this handoff.

The inspected source is `site/index.html`, `site/app.ts`, `site/style.css`, `site/gallery.json`, and the reviewed `origin/codex/public-pages` preparation at `40126d8686eff7880666a7d32dccc95aa0771eef`. The linked design checkout is based on public `main` commit `e1fc51556f064add017578e7f42bf3a8f95a26ce`. Re-check every source fact against the candidate intended for release before implementation or capture.

The current app declares six hash routes: `home`, `docs`, `gallery`, `download`, `changelog`, and `settings`. `site/app.ts` already contains browser-local preference, schedule, notification, workspace-tab, appearance, history, and presentation state; separate search-state records exist for documentation, settings, command palette, history, changelog, and appearance. These are implementation leads, not evidence that each flow is complete or verified.

The reviewed GitHub Pages preparation is explicitly unfinished. Its handoff says article anchor navigation remains to be implemented, documentation currently fails the added privacy check because public articles include private hosting addresses, historical images still need individual review, visitor guide and progress checks remain unfinished, and there is no final current capture source. The proposed workflow has not run. `site/wiki-status.json` on that reviewed lane declares `status: unavailable`, `articles: []`, and a null source commit. The anonymous wiki query returned “Repository not found,” which does not establish whether an unpublished or private wiki exists. GitHub Pages has not been configured, and the repository About homepage field is empty according to the task baseline. Treat all these as open blockers until independently checked.

## Design direction

Make the public home a task-oriented documentation entry point, not a download-first campaign. Preserve the source's restrained green, Material-style surfaces and existing six-section information architecture, while moving the first decision toward “What are you trying to do?” Every prominent action must lead to real included content or a clearly stated external destination. Do not use historical product captures as current proof. Keep download availability and release facts tied to the actual verified release data.

Use a consistent page frame: skip link, compact identity and primary navigation, route title and concise purpose, route-local search, main content, contextual “next step” links, and a small footer with source links. On narrow screens, navigation becomes a labelled menu or horizontally scrollable tab set with visible focus and no hidden destinations. Keep content width readable, let code and tables scroll within their own labelled regions, and never use fixed-height article columns that cut off text.

### User tasks and routes

| User task | Route and entry point | Successful path | Required truthful states |
|---|---|---|---|
| Understand what Material Git does and choose a first task | `#/home` | Select a task card or guided walkthrough step, then continue to the exact article or workflow | Initial, selected task, saved progress, resumed progress, storage unavailable |
| Find instructions for a workflow | `#/docs` | Search or choose a category, open a complete article, follow its in-page anchors and related links | Loading, no results, invalid pattern, article unavailable, broken-link recovery |
| Inspect current product captures | `#/gallery` | Filter the reviewed capture inventory, open an image, read its source/version and capture limitations | Current capture, historical capture, excluded capture explanation, empty result, image load failure |
| Choose a release asset | `#/download` | Read exact version, platform, source and asset details, then follow the verified release link | Release loading, current release, none available, service failure, stale release warning |
| Review release history | `#/changelog` | Search, page through actual release records, open source release notes | Loading, empty, no match, pagination boundary, API failure |
| Customize this visitor's reading experience | `#/settings` | Search settings, change a preference, observe immediate effect and reload persistence | Defaults, saved, storage unavailable, invalid import, reset confirmation |
| Read the complete wiki | Planned local route within `#/docs` | Choose a wiki section from a local index and follow internal anchors and related pages | Must remain unavailable until wiki source/content is actually obtained and included |

The wiki must be materialized inside the deployed documentation experience. An outbound link to the repository wiki is supplementary only. Build a stable wiki inventory with category indexes, pages, heading identifiers, internal links, and related-content links. Do not invent article text or present an empty index as full coverage.

### Guided walkthrough and progress

The home screen should offer a clearly labelled interactive example, separate from live application behavior. Example copy must say that the walkthrough is illustrative and does not execute the installed desktop product. It changes its explanation as visitors select a goal; every step has Back, Next, Skip where optional, and a visible progress count. A visitor can mark an article or step complete, resume later, reset their own progress, and see a storage-unavailable message when persistence cannot be written.

Store only visitor-owned progress and ordinary preferences in browser storage. Keep progress data versioned, bounded, validated on read, and local to the browser profile. Do not transmit reading history or search patterns. A malformed or old record falls back safely and explains the reset. Listen for storage changes across tabs and reconcile without losing a newer state. Do not store personal vocabulary payloads, imported file paths, credentials, or private source content. The existing app already uses `localStorage` and a storage listener for several preference domains; confirm the walkthrough uses a distinct, documented key and does not collide with them.

Suggested walkthrough sequence:

1. Choose a task such as inspecting a repository, reviewing a release, or learning the interface.
2. Show the relevant documentation category and explain how the source article connects to the task.
3. Let the visitor reveal a short illustrative diagram or example, with an explicit “example only” label.
4. Offer the next related article and persist completion only after an explicit visitor action.

The diagram may show a visitor-controlled path such as `Choose a task → Read a guide → Inspect a source-bound capture → Open the real release`. Selecting each node updates a nearby explanation and associated internal link. It must be operable by keyboard and screen reader; a static SVG may be decorative only when the same content and links are available in adjacent text.

## Content model and navigation

Treat `site/app.ts` route state as the source of current navigation behavior, but upgrade the content model so routes can address category indexes, article identifiers, wiki pages, heading anchors, and related-content destinations with stable URLs. A direct URL, reload, browser Back/Forward, and copied anchor link must all restore the intended content. When an old or unknown identifier is opened, show a useful not-found state with search and category links.

The documentation index should include every checked-in article exactly once, grouped by its real category. Each category index contains a short purpose, the complete article list, and links to related categories. Each article preserves its full reviewed body, heading hierarchy, code, tables, warnings, and source citations. Rewrite private host addresses out of public prose through source review; do not weaken the privacy check. Resolve local links to included content routes. External source links should be labelled as external and must never be used as a substitute for content that is required in the site.

For every article and wiki page, expose a local table of contents generated from its actual headings. Clicking a heading updates the URL fragment and focus, while leaving browser navigation meaningful. Preserve duplicate-heading disambiguation deterministically. Internal links to another article or wiki section must remain within the deployed site and work from a fresh direct load. Related-content links should be based on reviewed topic relationships, not generated guesses.

The six existing primary destinations remain visible. A category selector, article table of contents, related links, breadcrumb trail, search results, gallery filters, release pagination, and settings groups each have their own local interaction model. Keep a route inventory that names every collection and its exact search scope; do not treat one global search box as coverage of every collection.

## Search, settings, and shared controls

The source declares separate search states for documentation, settings, palette, history, changelog, and appearance. Preserve that isolation and enumerate every rendered list or collection that needs a local search: documentation categories, article index, article contents where useful, wiki index, gallery, releases, settings options, appearance options, history, notifications, command palette, and any dropdown or context menu. Each field filters only its named collection and owns independent query, mode, pattern, flags, errors, history, and saved snippets.

Plain-text search is the default. Place an accessible regex-builder affordance immediately beside each search field. The attached builder must expose the real supported engine and version, guided and raw construction, flags, validation, explanation, capability warnings, captures, replacement preview where applicable, bounded evaluation, and safe handling of zero-width matches and slow patterns. A constrained viewport may open an anchored full-width panel, but closing it returns focus to the originating field. Do not invent unsupported regex constructs; show exact engine limitations.

The preferences route is itself a user-facing settings surface. It needs its own searchable option inventory and adjacent regex builder, plus discoverable plain-text settings navigation. The current `settingDefinitions` inventory includes language, independent English and Cantonese playfulness, emojis in dialogs, presentation mode, display name, theme, accent color, text size, typeface, density, motion, logo, narration and voices, accessibility, attention modes, schedule, personal vocabulary, navigation, appearance, history, notifications, import/export, and reset. Map every rendered setting to an explanation, current value, default, effect, reset path, validation, and unavailable-state message. Verify the implemented controls rather than assuming the list means completion.

The shared UI contract applies to this documentation experience. Track the complete surface-by-surface requirements in a separate, checked inventory during implementation. This includes the three language modes (English, Cantonese, bilingual), independent persisted playfulness controls, dialog emoji preference, locally supplied personal-vocabulary control and reset/replace/error states, accessibility entry and tools, reduced motion, text scaling and contrast, information guidance, contextual optional wizards above capable controls, per-element appearance and locking, visitor-owned version history and exports, scheduled appearance, non-blocking notifications, command palette, universal searchable context/dropdown menus, attention accommodations, and the full advanced search builder. The page's settings must offer the features required of a settings surface. Any item claimed not to apply needs a recorded reason and remains open until accepted by its contract.

Do not include private wording or mappings in source, default strings, examples, tests, browser storage samples, logs, releases, or the public site. The upload control accepts a visitor-supplied local file only, validates all input before applying any change, never sends it over the network, and restores original wording when cleared. No payload, path, metadata, or mapped string may appear in browser history, exports, analytics, diagnostics, or captures.

## Visual system and responsive behavior

Retain the existing green-oriented Material theme and typography hierarchy visible in `site/style.css`, but align all states to the checked-in component tokens and measured built layout. Use a calm reading canvas, clear section spacing, bounded line lengths, high-contrast body text, visible focus rings, consistent surface borders, and semantic headings. Keep the display type on the home route subordinate to the user task; avoid an oversized hero that pushes documentation and task selection below the initial view.

Cover widths from approximately 320 CSS pixels upward unless the supported deployment contract sets a stricter minimum. At 320 pixels, navigation may collapse, search fields stack, filters wrap, sidebars become in-flow sections, images scale to available width, and tables scroll inside their own labelled region. No page-level horizontal scroll, clipped controls, overlapping labels, or inaccessible content is acceptable. At 200% zoom/text scale, maintain readable order and access to every action; preserve browser zoom rather than locking the viewport.

Capture normal viewport behavior at a representative desktop size and at the declared minimum width. Review light and dark modes, 100%, 125%, 150%, and 200% display scaling, and each supported language mode. Reduced motion must eliminate nonessential animation and smooth scrolling while retaining state changes and progress feedback. Focus and low-stimulation accommodations stay optional, off by default, reversible in one obvious action, and compatible with platform reduced-motion preferences.

## Accessibility and interaction

Use semantic landmarks, a skip link, one meaningful page heading, ordered headings, labelled controls, status announcements for result counts and save states, and descriptive link names. All navigation, popovers, menus, article anchors, galleries, dialog decisions, search builders, settings controls, and progress actions must work without a pointer. Keep visible focus on every theme. Open menus and builders with predictable focus, support arrow navigation where appropriate, close with Escape, and return focus to the invoking control.

Every rendered element that can support contextual actions needs a working context menu and accessible keyboard and touch equivalent. Include appearance editing and element locking where applicable, plus the menu's own local filter and adjacent regex builder. Do not give decorative artwork a live-control appearance. Informational and success feedback uses non-blocking notifications; use a blocking dialog only for a decision that prevents continuing, such as discarding visitor changes or resetting progress.

Screen-reader announcements must state meaningful changes, such as “3 guides found”, “Progress saved in this browser”, “Pattern is invalid”, or “Wiki content is unavailable”. Do not announce every keystroke or repeat the whole page after a small update. Images have useful alt text when informative and empty alt when decorative. The walkthrough's diagram has equivalent adjacent text and links.

## Asset and privacy rules

The current `site/gallery.json` inventory records historical captures from source commit `e464ff70f195dbd9584614b92a9547074e49200d`, dated October 8, 2026 UTC. The reviewed GitHub Pages handoff says 21 historical originals need individual identity and machine-path review and must not be presented as current. Preserve originals and their original provenance in the archive, but publish only assets that pass privacy and provenance review. Mark historical images visibly as historical if any remain in the gallery. Replace current product presentation with genuine captures from the current source-bound built application; never redraw, crop to conceal a problem, fabricate, or relabel old evidence as current.

Do not publish private hosting addresses, machine paths, credentials, private content, non-public wording, or unrelated user data. Keep images local and content-addressed where practical. Every current capture needs a receipt with exact source commit, built output identity/hash, named state, viewport, device scale, theme, language mode, capture method, timestamp and timezone from validated provenance, privacy verdict, and asset hash. A missing receipt is an acceptance gap, not a blank field to infer.

## Verification and capture plan

This handoff establishes no verification result. Before release, run the documented site builder and only the decisive checks for the changed surface, then verify the built output in an isolated headless browser. Inspect desktop and approximately 320-pixel layouts, every route and internal anchor, direct route reload, browser history, search and regex behavior, guided progress persistence and reset, language/theme/reduced-motion state, keyboard-only use, screen-reader names and announcements, image delivery, console/network errors, privacy, and page overflow.

Bind every retained screenshot to the exact source commit and built-output hash. At minimum capture home initial and guided-progress/resume states, documentation category and article with working anchor navigation, wiki index and article only after real content is available, gallery's clearly dated current/historical states, release/download success and unavailable states, settings/search/builder state, and narrow-layout navigation. Do not capture placeholders as proof of missing wiki or deployment behavior; record the blocker in text. Inspect the actual pixels and receipts before promoting captures into the README or gallery.

Required acceptance gaps at handoff time:

- GitHub Pages workflow in `origin/codex/public-pages` has not run or been independently verified.
- The reviewed lane still lacks completed client-side article/anchor navigation.
- Public documentation currently trips its privacy check due to private hosting addresses.
- Historical captures have not all been reviewed, and no current capture source is identified.
- The interactive guide, visitor progress persistence acceptance, and built-browser matrix are not complete.
- The public wiki snapshot is empty and unavailable; complete local wiki content cannot be claimed.
- GitHub Pages configuration, live endpoint, deployed source/assets, and exact repository About homepage readback are not verified.
- The final site must pass the complete shared UI contract, not just the subset reflected in this handoff.

## Implementation sequence

1. Re-inventory documentation and wiki content from accessible source; resolve wiki availability and privacy-safe article text.
2. Finish route and anchor model; build category, article, and wiki indexes from complete inventories.
3. Implement the task-first home, interactive explanatory diagram, guided walkthrough, and visitor-local progress.
4. Complete every local search surface with isolated state and its anchored advanced builder; complete the documentation/settings accessibility and localization inventory.
5. Audit and classify all historical captures; obtain new genuine current captures from the verified built application.
6. Run focused build and route/privacy/accessibility checks; exercise the headless viewport, language, theme, motion, scale, persistence, and keyboard matrix.
7. Review final pixels, receipts, public text, and asset hashes; update README and site content with only verified current evidence.
8. Only after the deployment owner enables GitHub Pages, deploy the reviewed output, read back the live home and assets, and verify the exact repository About homepage URL.

Do not mark the design or delivery complete until each relevant item has evidence from the actual built and deployed surface. Keep unavailable wiki or hosting work explicitly pending with its exact external action and retry condition.
