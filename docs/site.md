# Material Git documentation website

The Material Git documentation website is a standalone Lit application with genuine `@material/web` 2.5.0 components. It does not use Electron's `window.material` bridge or run GitHub commands. Its source is in `site/`; output is generated into ignored `site/dist/`.

Build with `node scripts/build-site.mjs` after `npm ci`. The builder injects the package version and actual UTC build time, bundles the pinned command catalog and shared validation helpers, and copies the HTML and stylesheet. Serve the output with any static HTTP server. The public URL is managed through the repository's About website setting and Sites hosting.

## Information and verification

The home page describes a guided desktop workspace for GitHub CLI, REST, and GraphQL. Homepage inventory labels distinguish command records, REST operations, and GraphQL named types. The command reference uses every record in `data/gh-catalog.json`, including usage, summaries, full descriptions, argument metadata, options, enumerated choices, mutation/destruction labels, and official GitHub CLI manual links. This catalog is reference metadata, not evidence that every desktop workflow has passed interactive verification. The guide links to the separate command coverage record. The reference explicitly identifies 196 catalogued commands, 181 guided runner definitions, and 15 exclusions from the generic runner; these counts do not assert interactive success. Desktop installation, Windows packaging, signing status, and runtime workflow verification are not asserted by the site build.

The Install tab requests `https://api.github.com/repos/Ding-Ding-Projects/material-git/releases/latest` with a ten-second timeout. A 404 means no stable public release is available. Other failures have a retry control and an ordinary GitHub Releases link. Only actual `.exe` assets returned by that endpoint receive download links. No seeded or placeholder installer is used. The site describes installers as unsigned and explains that the Windows package includes the pinned GitHub CLI.

## API and account guide

The Guide tab walks through installation, browser device sign-in, repository/workspace selection, typed REST requests, GraphQL selection trees, and CLI configuration. Jump controls scroll to real sections. Requests execute in the desktop application only; the website does not bundle the large API catalogs, authenticate users, or send API requests on their behalf.

The exact pinned API inventory is 1,232 REST operations across 816 paths and 44 categories; 1,829 non-introspection GraphQL named types and 8,419 object/interface/input fields; 31 Query root fields and 278 Mutation root fields. These are declared-schema counts, not successful live request counts. The guide links to the official fixed source commits and to `docs/api-coverage.md` for SHA-256 values, licenses, reproducible generation, and constraints.

REST guidance covers declared parameter/body types, explicit mutation confirmation, actual HTTP status and sanitized results, manual pagination, GitHub.com hosting, the declared `uploads.github.com` release-asset operation, native file grants, 64 MiB uploads, 4 MiB responses, and a 60-second process bound. GraphQL guidance explains typed field/argument trees, interface/union fragments, reference-schema validation, unavailable arbitrary documents/introspection, explicit cursor pagination, and HTTP 200 responses that still contain errors or partial data.

Account guidance explains that switching reads back actual active/valid status and that environment-token overrides can prevent a saved account becoming active. Local logout does not revoke a token on GitHub. The dedicated CLI settings documentation distinguishes 14 known keys from 12 guided controls, global/host scope, environment overrides, executable selection without extra arguments, unavailable custom API routing/Unix sockets, and terminal settings that do not change desktop appearance.

The documented boundaries include permissions, scopes, rate limits, organization policy, previews, server-side validation, incomplete client validation of certain format/pattern keywords, and free/pro/team GraphQL coverage that does not represent every Enterprise schema. No claim is made that every endpoint or flag combination has been exercised live.

## Local preferences

Site preferences persist separately from desktop preferences in this visitor's browser. English, Cantonese, and bilingual modes apply to site navigation, guidance, preferences, empty states, and status copy. Factual GitHub CLI reference text stays exact. English and Cantonese playfulness each use independent 1–5 controls. Homepage copy responds to both controls; status copy uses the shared localization helper. Theme supports dark, light, and system. Reduced motion follows both the local toggle and the operating-system preference. The message emoji toggle changes non-semantic status decorations only.

Personal vocabulary exists only after a visitor imports a valid local JSON file. The visible input uses the shared strict parser, validating complete bytes before applying or caching. Its contract is `schemaVersion: 1` with a string-to-string `entries` object: maximum 64 KiB, 256 entries, 128-character keys, 256-character values, and depth 2. Unknown fields, versions, duplicate/unsafe keys, malformed JSON or UTF-8, control characters, and invalid types are rejected. Failed imports preserve the last valid data. Clear purges the browser cache and restores shipped wording. No mappings, templates, or personal files are shipped.

Command and settings search have independent state. Plain text is the default. Each has an adjacent anchored regex builder, with start/end anchors, wildcard, character class and alternatives, explicit regex enablement, pattern input, inline invalid-pattern feedback and clear action. Regex evaluation runs in a module worker with a 200 ms lifetime bound, a 256-character pattern limit, a 512-candidate bound, and a 16,384-character candidate limit. Slow workers are terminated without blocking the UI thread. Settings search indexes vocabulary upload, status and reset terms, and renders the live matching controls.

## Scope and outstanding verification

The site offers the controls shown in its Settings tab. It does not yet implement the desktop-only execution bridge, spoken narration, appearance scheduling, per-element styling, custom-logo conversion, or universal file conversion. These are disclosed in the interface rather than represented as complete. A successful static build establishes compilation only. Browser interaction, narrow layouts, keyboard operation, persistence, API failure states and deployed hosting require separate verification evidence.


Deployment on 2026-10-08 succeeded at https://material-git.earlyray.chatgpt.site with owner-private access. The requested About homepage update to that exact URL was rejected with HTTP 403 (resource not accessible by integration); it remains pending repository metadata access. The deployed source commit is `71eb0f5e6d1c3a313cde5771dda86a3d4f5eb7f7` in the Sites source repository. Local Chromium checks passed command search and a 375-pixel layout with no horizontal overflow or page errors.


## Source update verification

The API guide update was deployed successfully with owner-private access from Sites source commit `709b4bc8686a0ab34410505d1ddc71d1639f934c`. It does not change hosting visibility or repository About metadata. Headless Chromium checked the built static output at 1440-pixel desktop and 375-pixel mobile widths, including bilingual guide copy, all inventory rows, guide jump actions, command search, and the installation view. No browser page errors or document-level horizontal overflow occurred. Every native tab index matched its rendered page after navigation; duplicate click handling was removed to keep the native Material selected indicator synchronized. Long bilingual buttons wrap and the native tab strip scrolls within its own navigation region. The latest release is always fetched rather than pinned to a historical build; at verification the endpoint returned `build-8-1` with a real `Setup.exe` link.
