# Requirements and evidence

All 104 canonical obligations are represented using public-neutral identifiers. This is a complete inventory of required rows, not a claim of complete implementation. App, documentation site and repository applicability are assessed separately; only genuine narrow clauses are marked not applicable. Open/unknown/blocked states remain release obligations.

Source support, built GUI integration, live API permission and installed Windows behavior are separate evidence dimensions. A source file, schema count, mocked test or old screenshot does not close a live workflow. Cantonese articles are labelled drafts and full translation/localization proof remains open.

Run `node scripts/check-feature-coverage.mjs` to validate rows and links while reporting unresolved obligations. `--require-complete` must fail until every applicable obligation is independently verified. Negative tests remove rows/evidence to prove failure boundaries.

[Machine inventory](../../docs/coverage/features.json) · [GitHub action audit](../coverage/github-actions-audit.md) · [Git action audit](../coverage/git-actions-audit.md) · [Roadmap](../../ROADMAP.md) · [Handoff](../../HANDOFF.md)

## personalization

- [Language modes](personalization/language.md) · [粵語文章](personalization/language.yue.md) — `language`
- [Funny-level sliders and the dialog emoji switch](personalization/funny-emoji.md) · [粵語文章](personalization/funny-emoji.yue.md) — `funny-emoji`
- [Local personal-vocabulary JSON upload](personalization/personal-vocabulary.md) · [粵語文章](personalization/personal-vocabulary.yue.md) — `personal-vocabulary`
- [Universal School mode](personalization/school-mode.md) · [粵語文章](personalization/school-mode.yue.md) — `school-mode`
- [Spoken narrator and voice pickers](personalization/narration.md) · [粵語文章](personalization/narration.yue.md) — `narration`
- [Scheduled and external settings sources](personalization/scheduled-settings.md) · [粵語文章](personalization/scheduled-settings.yue.md) — `scheduled-settings`
- [Renaming the application](personalization/display-name.md) · [粵語文章](personalization/display-name.yue.md) — `display-name`
- [ADHD modes](personalization/adhd-modes.md) · [粵語文章](personalization/adhd-modes.yue.md) — `adhd-modes`
- [Dim sum surprise](personalization/dim-sum.md) · [粵語文章](personalization/dim-sum.yue.md) — `dim-sum`
- [Public dim-sum photo source](personalization/dim-sum-photo-source.md) · [粵語文章](personalization/dim-sum-photo-source.yue.md) — `dim-sum-photo-source`

## appearance

- [Material Design 3 conformance](appearance/material-design.md) · [粵語文章](appearance/material-design.yue.md) — `material-design`
- [Workflow navigation and window chrome](appearance/workflow-navigation.md) · [粵語文章](appearance/workflow-navigation.yue.md) — `workflow-navigation`
- [Material Design 3 motion with a complete reduced-motion path](appearance/motion.md) · [粵語文章](appearance/motion.yue.md) — `motion`
- [Per-element appearance editor](appearance/appearance-editor.md) · [粵語文章](appearance/appearance-editor.yue.md) — `appearance-editor`
- [Infinite colour picker and translator](appearance/color-picker.md) · [粵語文章](appearance/color-picker.yue.md) — `color-picker`
- [application logo customization](appearance/logo-customization.md) · [粵語文章](appearance/logo-customization.yue.md) — `logo-customization`
- [Overlays and panels](appearance/overlay-panels.md) · [粵語文章](appearance/overlay-panels.yue.md) — `overlay-panels`
- [Collapsible filters and statistics](appearance/collapse-filters.md) · [粵語文章](appearance/collapse-filters.yue.md) — `collapse-filters`
- [Accessibility, sizing, and layout without layout clipping defect](appearance/accessibility-sizing.md) · [粵語文章](appearance/accessibility-sizing.yue.md) — `accessibility-sizing`
- [Functional UI and truthful empty states](appearance/functional-ui.md) · [粵語文章](appearance/functional-ui.yue.md) — `functional-ui`

## navigation

- [Browser-style tabbed navigation](navigation/tabs.md) · [粵語文章](navigation/tabs.yue.md) — `tabs`
- [Regex builder on every search surface](navigation/regex-search.md) · [粵語文章](navigation/regex-search.yue.md) — `regex-search`
- [`Ctrl+Shift+F` command palette](navigation/command-palette.md) · [粵語文章](navigation/command-palette.yue.md) — `command-palette`
- [A context menu on every element](navigation/context-menus.md) · [粵語文章](navigation/context-menus.yue.md) — `context-menus`
- [Context menus show working shortcuts](navigation/menu-shortcuts.md) · [粵語文章](navigation/menu-shortcuts.yue.md) — `menu-shortcuts`
- [Rich controls wherever a value is shown](navigation/rich-controls.md) · [粵語文章](navigation/rich-controls.yue.md) — `rich-controls`
- [Guided forms](navigation/guided-forms.md) · [粵語文章](navigation/guided-forms.yue.md) — `guided-forms`
- [Settings that explain themselves](navigation/settings-explanations.md) · [粵語文章](navigation/settings-explanations.yue.md) — `settings-explanations`
- [Presets for blank-slate editors](navigation/blank-editors.md) · [粵語文章](navigation/blank-editors.yue.md) — `blank-editors`

## safety

- [Two-key super confirmation](safety/super-confirmation.md) · [粵語文章](safety/super-confirmation.yue.md) — `super-confirmation`
- [Toy locks on every element](safety/element-locks.md) · [粵語文章](safety/element-locks.yue.md) — `element-locks`
- [Support Tickets recovery desk](safety/support-tickets.md) · [粵語文章](safety/support-tickets.yue.md) — `support-tickets`
- [The unlock ladder](safety/unlock-ladder.md) · [粵語文章](safety/unlock-ladder.yue.md) — `unlock-ladder`
- [Built-in authenticator](safety/authenticator.md) · [粵語文章](safety/authenticator.yue.md) — `authenticator`
- [QR pairing for OTP registration](safety/qr-pairing.md) · [粵語文章](safety/qr-pairing.yue.md) — `qr-pairing`
- [Free by default, honest when paid, never nagging](safety/honest-monetization.md) · [粵語文章](safety/honest-monetization.yue.md) — `honest-monetization`

## records

- [Local version history](records/local-history.md) · [粵語文章](records/local-history.yue.md) — `local-history`
- [Export everything, in every format](records/exports.md) · [粵語文章](records/exports.yue.md) — `exports`
- [Bulk actions everywhere](records/bulk-actions.md) · [粵語文章](records/bulk-actions.yue.md) — `bulk-actions`
- [Changelog viewer](records/changelog.md) · [粵語文章](records/changelog.yue.md) — `changelog`
- [Offline documentation browser in every application](records/offline-docs.md) · [粵語文章](records/offline-docs.yue.md) — `offline-docs`
- [Provider-authored text is rendered](records/rendered-provider-text.md) · [粵語文章](records/rendered-provider-text.yue.md) — `rendered-provider-text`
- [Non-blocking notifications and their centre](records/notifications.md) · [粵語文章](records/notifications.yue.md) — `notifications`

## tools

- [Universal local file converter](tools/file-converter.md) · [粵語文章](tools/file-converter.yue.md) — `file-converter`
- [Universal local Ollama suite manager](tools/ollama-suite.md) · [粵語文章](tools/ollama-suite.yue.md) — `ollama-suite`
- [External editor and VS Code hand-off](tools/external-editor.md) · [粵語文章](tools/external-editor.yue.md) — `external-editor`
- [Browser-extension download hand-off surfaces](tools/download-handoff.md) · [粵語文章](tools/download-handoff.yue.md) — `download-handoff`
- [Publishing to a forge](tools/forge-publishing.md) · [粵語文章](tools/forge-publishing.yue.md) — `forge-publishing`
- [Progress where it started, recovery where it broke](tools/progress-recovery.md) · [粵語文章](tools/progress-recovery.yue.md) — `progress-recovery`

## verification

- [Per-surface completeness inventory and parity](verification/completeness-parity.md) · [粵語文章](verification/completeness-parity.yue.md) — `completeness-parity`
- [Front-screen version and updated-at provenance](verification/front-provenance.md) · [粵語文章](verification/front-provenance.yue.md) — `front-provenance`
- [Real screenshots wherever a surface is described](verification/product-evidence.md) · [粵語文章](verification/product-evidence.yue.md) — `product-evidence`
- [committed screen recording](verification/screen-recording.md) · [粵語文章](verification/screen-recording.yue.md) — `screen-recording`
- [Checked-in design-reference parity](verification/design-reference-parity.md) · [粵語文章](verification/design-reference-parity.yue.md) — `design-reference-parity`
- [Design surfaces live in the repository](verification/design-folder.md) · [粵語文章](verification/design-folder.yue.md) — `design-folder`
- [layout clipping defect matrix for every built surface](verification/responsive-layout-matrix.md) · [粵語文章](verification/responsive-layout-matrix.yue.md) — `responsive-layout-matrix`
- [Public screenshot gallery at resource limit](verification/public-capture-gallery.md) · [粵語文章](verification/public-capture-gallery.yue.md) — `public-capture-gallery`

## documentation-site

- [A Material Design 3 GitHub Pages carrying every feature](documentation-site/landing-site.md) · [粵語文章](documentation-site/landing-site.yue.md) — `landing-site`
- [A mobile-friendly GitHub Pages](documentation-site/responsive-documentation-site.md) · [粵語文章](documentation-site/responsive-documentation-site.yue.md) — `responsive-documentation-site`
- [Verified installer download on Home](documentation-site/installer-download-button.md) · [粵語文章](documentation-site/installer-download-button.yue.md) — `installer-download-button`
- [One detailed article per feature on the GitHub Pages](documentation-site/feature-articles.md) · [粵語文章](documentation-site/feature-articles.yue.md) — `feature-articles`
- [Complete, scripted font vendoring](documentation-site/vendored-fonts.md) · [粵語文章](documentation-site/vendored-fonts.yue.md) — `vendored-fonts`
- [A real picture when a link is pasted into Discord](documentation-site/shared-link-embed.md) · [粵語文章](documentation-site/shared-link-embed.yue.md) — `shared-link-embed`
- [The GitHub Pages linked from the repository](documentation-site/homepage-link.md) · [粵語文章](documentation-site/homepage-link.yue.md) — `homepage-link`
- [private vocabulary only after authentication](documentation-site/vocabulary-unlock-boundary.md) · [粵語文章](documentation-site/vocabulary-unlock-boundary.yue.md) — `vocabulary-unlock-boundary`

## status

- [Status Hub registration and status surface](status/status-hub.md) · [粵語草稿](status/status-hub.yue.md) — `status-hub`
- [Discord status bridge](status/discord-status-bridge.md) · [粵語草稿](status/discord-status-bridge.yue.md) — `discord-status-bridge`
- [Verified panic dispatch](status/panic-webhooks.md) · [粵語草稿](status/panic-webhooks.yue.md) — `panic-webhooks`
- [Tidbyt status frames](status/tidbyt-displays.md) · [粵語草稿](status/tidbyt-displays.yue.md) — `tidbyt-displays`

## build

- [Root `build.bat` and `build-installer.bat`](build/build-entrypoints.md) · [粵語草稿](build/build-entrypoints.yue.md) — `build-entrypoints`
- [One fresh Microsoft Windows build-and-run command](build/fresh-build-run-command.md) · [粵語草稿](build/fresh-build-run-command.yue.md) — `fresh-build-run-command`
- [One-click dependency or prerequisite fetcher](build/dependency-fetcher.md) · [粵語草稿](build/dependency-fetcher.yue.md) — `dependency-fetcher`
- [Every application bundles its dependencies and prerequisites](build/bundled-dependencies.md) · [粵語草稿](build/bundled-dependencies.yue.md) — `bundled-dependencies`
- [Genuine Squirrel.Windows installers](build/squirrel-installer.md) · [粵語草稿](build/squirrel-installer.yue.md) — `squirrel-installer`
- [Required-format self-signing only](build/self-signing.md) · [粵語草稿](build/self-signing.yue.md) — `self-signing`
- [Chrome-style automatic updates](build/auto-updates.md) · [粵語草稿](build/auto-updates.yue.md) — `auto-updates`
- [Original logo and packaged icon](build/app-icon.md) · [粵語草稿](build/app-icon.yue.md) — `app-icon`

## release

- [A real release on every push](release/release-workflow.md) · [粵語草稿](release/release-workflow.yue.md) — `release-workflow`
- [End-to-end workflow timing in release notes](release/release-timing.md) · [粵語草稿](release/release-timing.yue.md) — `release-timing`
- [Line counts counted by GitHub Actions](release/release-line-counts.md) · [粵語草稿](release/release-line-counts.yue.md) — `release-line-counts`
- [A dim-sum photo on every release](release/release-dim-sum-photo.md) · [粵語草稿](release/release-dim-sum-photo.yue.md) — `release-dim-sum-photo`
- [Dim sum release code names](release/dim-sum-code-names.md) · [粵語草稿](release/dim-sum-code-names.yue.md) — `dim-sum-code-names`
- [GitHub Actions dependency or prerequisite bootstrap and safe outputs](release/ci-bootstrap.md) · [粵語草稿](release/ci-bootstrap.yue.md) — `ci-bootstrap`
- [Live GitHub Actions runner selection](release/runner-selection.md) · [粵語草稿](release/runner-selection.yue.md) — `runner-selection`
- [Encrypted public builder for private repositories](release/encrypted-public-builder.md) · [粵語草稿](release/encrypted-public-builder.yue.md) — `encrypted-public-builder`

## repository

- [A tabbed README, not a scroll](repository/tabbed-readme.md) · [粵語草稿](repository/tabbed-readme.yue.md) — `tabbed-readme`
- [How long a human would have taken](repository/human-time-estimate.md) · [粵語草稿](repository/human-time-estimate.yue.md) — `human-time-estimate`
- [Sanitized instruction mirror](repository/sanitized-instruction-copy.md) · [粵語草稿](repository/sanitized-instruction-copy.yue.md) — `sanitized-instruction-copy`
- [Sanitized vocabulary-discipline block in `AGENTS.md`](repository/agents-md-vocabulary-block.md) · [粵語草稿](repository/agents-md-vocabulary-block.yue.md) — `agents-md-vocabulary-block`
- [Vocabulary hash lock](repository/vocabulary-hash-lock.md) · [粵語草稿](repository/vocabulary-hash-lock.yue.md) — `vocabulary-hash-lock`
- [`ROADMAP.md` checklist](repository/roadmap-checklist.md) · [粵語草稿](repository/roadmap-checklist.yue.md) — `roadmap-checklist`
- [One Markdown file per feature](repository/feature-docs.md) · [粵語草稿](repository/feature-docs.yue.md) — `feature-docs`
- [Postman collections for HTTP APIs](repository/postman-collections.md) · [粵語草稿](repository/postman-collections.yue.md) — `postman-collections`
- [Wiki and GitHub Pages source kept current](repository/wiki-and-site-sync.md) · [粵語草稿](repository/wiki-and-site-sync.yue.md) — `wiki-and-site-sync`
- [`HANDOFF.md` and the GitHub handoff section](repository/handoff-record.md) · [粵語草稿](repository/handoff-record.yue.md) — `handoff-record`
- [pushed `CLOSEOUT_PROMPT.md`](repository/closeout-prompt.md) · [粵語草稿](repository/closeout-prompt.yue.md) — `closeout-prompt`
- [Discussions as the running record](repository/discussion-records.md) · [粵語草稿](repository/discussion-records.yue.md) — `discussion-records`
- [GitHub Project linked to the repository](repository/project-board.md) · [粵語草稿](repository/project-board.yue.md) — `project-board`
- [repository operational skill](repository/operational-skill.md) · [粵語草稿](repository/operational-skill.yue.md) — `operational-skill`

## instruction-records

- [README opens with the prompt banner](instruction-records/instruction-prompt-banner.md) · [粵語草稿](instruction-records/instruction-prompt-banner.yue.md) — `instruction-prompt-banner`
- [Single-file editions of the canonical instruction repository](instruction-records/portable-instruction-editions.md) · [粵語草稿](instruction-records/portable-instruction-editions.yue.md) — `portable-instruction-editions`
- [Project memory folders](instruction-records/project-profile.md) · [粵語草稿](instruction-records/project-profile.yue.md) — `project-profile`

## games

- [Every shared Roblox model, meaningfully used](games/roblox-model-catalogue.md) · [粵語草稿](games/roblox-model-catalogue.yue.md) — `roblox-model-catalogue`
- [Roblox visual realism](games/roblox-visual-realism.md) · [粵語草稿](games/roblox-visual-realism.yue.md) — `roblox-visual-realism`
