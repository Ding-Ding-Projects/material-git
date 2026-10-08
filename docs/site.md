# Material Git website

Material Git's website is the desktop product's landing page, documentation library, screenshot gallery, release history, and downloads guide. GitHub operations run in the desktop application. The website does not embed the application runtime, authenticate GitHub accounts, invoke commands, or represent catalog records as verified desktop workflows.

The existing hosted address is <https://material-git.earlyray.chatgpt.site>. Hosting retains its existing owner-private audience. A source change or passing local check does not establish that the new source has been deployed. Native deployment and repository About metadata verification are separate steps.

## Build and source provenance

Run `node scripts/build-site.mjs` after installing the repository dependencies. Source lives in `site/` and browser-only reusable compositions live in `src/site-shared/`. The static output is ignored at `site/dist/`.

The builder bundles all `docs/**/*.md` articles, their original source text, and their rendered Markdown. Every file must appear exactly once with its exact article identity, title, source, body, and HTML. `src/site-shared/build-contract.mjs` validates these boundaries. The negative regression removes each article and each individual boundary, requires failure, then verifies the restored bundle.

The initial screen shows the package version and the recorded source commit's updated-at date, including seconds and the visitor's local timezone. This date is not a launch time, file timestamp, or agent clock. Uncommitted website inputs are labelled development source and show the updated-at value as unavailable. Production should be built from the clean integrated source revision before packaging. The source link and bundled `documentation.json` preserve the source revision. Sites deployment source provenance is retained separately by its native source workflow.

All scripts, styles, icons, and screenshot assets are bundled locally. Typography uses the user's installed system families, with no remote font request or incomplete vendored font set. There are no analytics or tracking scripts. GitHub release checks and explicitly configured external schedule sources are the only application-initiated network requests.

## Website sections

- **Overview:** product introduction, repository/collaboration/delivery/account guidance, documentation and downloads entry points, and a reviewed application capture when one is available.
- **Documentation:** categorized articles, full-text plain search, an adjacent regex builder, internal article links, sanitized Markdown rendering, related articles, individual article export, and selected-article JSON/Markdown/HTML export.
- **Screenshots:** actual application captures declared in `site/gallery.json`. An empty manifest produces an honest unavailable state. The old `docs/images/desktop.png` is not copied or referenced by the site.
- **Downloads:** the actual latest stable public GitHub release, actual `.exe` assets, publication date, asset sizes, unsigned-installer disclosure, no-release state, failure state, retry, and links to the release source.
- **Release notes:** original provider-authored Markdown and dates, page-by-page access to the complete public release history (100 records per page), independent search and regex builder, and export of the visible notes. The API does not reliably expose an exact commit SHA; the viewer says so and links to the release tag rather than guessing.
- **Preferences:** independent website visitor preferences, voice enumeration and narration, language/playfulness controls, appearance, attention aids, personal vocabulary import, browser-local presentation mode, scheduling, navigation customization, history, and import/export.

The website uses official registered `@material/web` 2.5.0 buttons, fields, selects, switches, sliders, checkboxes, dialogs, progress indicators, and tabs. `mg-site-surface` and `mg-site-layout` are registered Lit document compositions with official Material elevation and system tokens; their internal semantic elements provide browser document structure. Scrollbars use the same Material surface and outline tokens. Native local-file, date, time, and color pickers remain browser facilities; the site does not replace them with simulated file access or painted form controls.

## Visitor state and localization

English, Cantonese, and bilingual presentation apply to website-owned navigation, guidance, preferences, empty states, and status messages. Repository-authored documentation and GitHub release records retain their original factual text. Each language has its own 1–5 playfulness control, defaulting to 5. Level 1 is serious. The controls change surrounding website copy while preserving facts. The emoji setting changes non-semantic message decoration.

The browser-local presentation mode forces English and suppresses the website's language, playfulness, Cantonese voice, and vocabulary controls. Its name is editable and a locally checked PIN is required to turn it off. Same-origin browser tabs receive saved-mode changes through browser storage events. This cannot share the desktop application's OS record, and is explicitly described as a presentation lock rather than a security boundary. Removing this website's browser storage resets the lock. Full lockout games, shared OS credentials, and suppression of all references within externally authored articles remain incomplete.

Personal vocabulary is available through a visible local JSON file picker. The shared strict parser validates the complete payload before application or caching: schema version 1, a string-to-string `entries` object, maximum 64 KiB, 256 entries, bounded keys/values and nesting, and rejection of malformed JSON/UTF-8, duplicate or unsafe keys, unknown versions/fields, and invalid types. Invalid imports retain the last valid cache. Clear removes the cache and restores shipped wording. Data and source-file metadata are omitted from exports and history. No sample or private mappings ship with the site.

Narration is off by default. Voice lists are read from the actual browser speech-synthesis API and refreshed on `voiceschanged`. English and Cantonese have separate stable voice-identity preferences, automatic selection, unavailable/fallback/network-voice explanations, rate, and pitch. Bilingual narration serializes English then Cantonese rather than overlapping. Browser/platform voice availability remains a runtime condition. Automatic screen-reader detection and a complete cooldown/category policy are not implemented.

## Schedules and appearance

The website reuses `shared/preferences-advanced.ts` validation, duplicate-key JSON parsing, rule matching, and deterministic resolution. Every exposed application preference key is available to scheduled rules. Rules support date bounds, all or selected weekdays, start/end times, enabled state, priorities, and an IANA timezone. Overnight windows belong to the starting weekday. Equal times cover a whole day; end times are exclusive. Repeated daylight-saving times match twice; skipped wall times do not occur. Higher priority wins and ties sort by stable rule identifier. Temporary overrides leave the visitor's base preferences recoverable.

Sources can be local, a versioned public HTTPS settings API, or a Home Assistant boolean entity. Connections reject embedded credentials, IP/local targets, custom ports and redirects. Responses are limited to 64 KiB and eight seconds, validated before application, and refreshed at bounded intervals. The browser must permit CORS. Failed or invalid sources retain local/base settings. Home Assistant access tokens are held only in memory for the current visit because a website cannot use the OS credential vault; they never enter local schedules, exports, history, or logs. A fresh visit requires re-entering the token. The website makes no claim that browser networking can replace a privileged desktop adapter.

Right-click an element, or focus a supported element and press Shift+F10, to open its browser-local appearance editor. The editor uses the shared validated appearance record for default, hover, focus, pressed, and disabled states. It provides the shared numeric fields, hexadecimal and HSL/RGB color translation, undo, reset, and JSON import/export. Records are bounded and selectors accept stable safe identifiers. Appearance maps can also travel in a validated schedule document, and a rule can import the per-element editor’s exported appearance record as its scheduled override. The appearance property search has its own adjacent regex builder and bounded worker. Complete Word-depth typography, named presets, and a full per-property schedule authoring UI remain incomplete.

## Navigation, search, palette, and exports

Navigation uses the shared validated workspace record. Website pages can be renamed, reordered with keyboard-accessible Earlier/Later actions, pinned, assigned to groups, and discovered through four independent searches: all tabs, open tabs, groups, and members of a selected group. Groups can be named, colored, pinned, and collapsed. A collapsed group keeps the active page visible, and a discoverable group control restores its members. Order, pins, groups and collapsed state survive reload. The bounded Material tab strip scrolls within its navigation region on narrow screens.

Ctrl+Shift+F opens a bounded Material command palette with an optional full-window size. It includes destinations, bundled articles, live preference controls, and exact preference jump actions. Palette, documentation, preference, history, release-note and tab searches have independent state, plain text defaults, adjacent builders, explicit regex opt-in, anchors/groups/classes/repetitions/alternatives, and invalid-pattern feedback. Regex evaluation stays in an isolated worker, with a 200 ms lifetime, 256-character patterns, at most 512 candidates and a 16,384-character regex candidate bound. Plain text searches full original article text. Very long article regex searches are therefore bounded rather than unlimited. The richer desktop regex preview/snippet feature set is not yet replicated completely on the website.

Documents support select-matches and inverse selection, with an explicit selected count and exports of the selected articles. Structured preferences and schedules export as versioned JSON, prose as Markdown/HTML, and visible release notes as Markdown. Browser exports are UTF-8. A website cannot enumerate local editors or prove an OS editor launch; exported text files remain directly openable in VS Code. Additional faithful formats, complete collection-wide bulk actions, archive settings, and direct browser-to-editor handoff remain incomplete.

Website preferences retain up to 60 browser-local visitor-state snapshots, bounded to 512 KiB. Base preferences, validated schedules, navigation groups/pins/order, appearance records, and non-secret presentation metadata are included. A restore appends a new snapshot. Vocabulary, logo image data and unlock credentials are excluded. This is an accessible browser equivalent, not an isolated Git repository. Restoring a record that would leave a locked presentation mode first requires unlocking that mode. Logo data and credentials remain intentionally outside this browser history. Complete retention/pruning/date filters and collection-wide bulk history operations remain outstanding.

## Verification and remaining work

The focused checks are:

```sh
node scripts/build-site.mjs
node --test site/regex-worker.test.mjs site/build.test.mjs
node --import tsx --test site/model.test.ts
node site/browser.test.mjs
```

The browser test uses the actual built static output, an isolated headless Chromium context, and real Material controls. It covers route/tab synchronization, full-text documentation search, sanitized article rendering, Ctrl+Shift+F activation, bilingual persistence, 320/375/768-pixel layouts at 200% text, reviewed-gallery-only rendering, schedule and tab-group persistence, state-specific appearance controls, and a controlled GitHub API failure. Controlled failure responses prove recovery behavior; they are not live GitHub account evidence. Site QA captures are independent from the genuine desktop capture gallery.

A passing static build or these focused checks do not establish universal feature completion, Windows installer verification, authenticated GitHub operation success, native desktop input proof, or deployed hosting. Universal browser feature gaps remain: all-format file conversion, an Ollama management equivalent, dim-sum surprise, toy element locks and Support Tickets, unlock ladder, full notification-center/bulk-action coverage, complete scheduled appearance authoring, richer tab interactions, advanced date filtering, full narration policy, and full per-surface capture/inventory enforcement. These must remain open until implemented and exercised. Native OS/vault/Git/editor operations require explicit browser equivalents and cannot be silently claimed from the desktop implementation.

## 廣東話摘要

呢個網站係 Material Git 桌面應用程式嘅介紹頁、文件庫、真實畫面集、版本記錄同下載指南。GitHub 操作由桌面應用程式執行，網站唔會將指令目錄當成產品主介面。文件全部包含喺建置入面，下載連結只會指向 GitHub 實際版本檔案，畫面只會使用有來源記錄嘅真實擷取。

訪客偏好設定只留喺瀏覽器，唔會自動改變桌面設定。網站共用已驗證嘅時間表、外觀同工作空間模型，支援語言、獨立趣味程度、聲線、日期同星期規則、分頁群組，以及本機匯入匯出。瀏覽器無法使用系統憑證庫或執行本機 Git，所以呢啲限制會直接說明。通過本機檢查唔代表網站已部署，亦唔代表所有通用功能已完成。

## Suggested articles

- [Authentication and account permissions](authentication.md)
- [Personalization](personalization.md)
- [Regex search](regex.md)
- [Build and packaging](build.md)
- [Verification gaps](verification-gaps.md)
