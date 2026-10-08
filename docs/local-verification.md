# Local verification record

On 2026-10-08, the Linux integration checkout passed TypeScript checking, the Electron/Vite production build, 64 Node behavioral tests, and three documentation regex tests. These counts record the verification at the initial integration; later commits may add checks.

Real headless Electron interaction completed a read-only GitHub repository list through command controls. Accounts, updates and settings opened without page errors. A separate isolated profile with no GitHub token verified a known UTF-8 converter result, unavailable Ollama retry behavior, regex matching/captures/replacement/navigation/filtering, and tab keyboard navigation. No mutating GitHub command, model pull/delete or live model chat was used in these checks.

Native Chromium accessibility evidence exposed correctly named tablist/tab roles and selected state. Explicit role attributes also make these accessible to the installed Playwright version. The regex panel's border box remained within the 1420×940 viewport after correcting box sizing. Documentation command search and the 375-pixel layout passed with no horizontal overflow or browser page errors.

Subprocess regressions include argument injection, bounded output, split UTF-8, secret redaction across chunks and the output limit, operation cancellation, and immutable event snapshots. Other focused checks cover real regex worker termination, RFC 6238 TOTP vectors, encrypted-service persistence, shared-record observation, atomic invalid preferences and vocabulary, conversion semantics and REST/GraphQL pagination.

Windows packaging, fresh-machine install/uninstall, browser login completion, update installation, real Windows secure storage and every CLI command remain separate verification obligations. Successful local builds and mocks do not prove them. See [remaining work](verification-gaps.md).

## Desktop and API integration update

The integrated revision passed 107 behavioral tests and TypeScript checking. Real isolated Linux Electron interaction verified the desktop explorer, task tabs, keyboard and pointer resizing, Material scrollbar controls, light/dark presentation, 760×600 layout, and 200% text. Practical integer controls, explicit enum defaults, entity identifiers, body-file validation, dedicated authentication routing, and API close guards passed focused interaction checks. The body-file review check supplied a path through the normal field setter; it did not automate the native file dialog or execute a mutation.

The integrated native bridge loaded all 1,232 REST operation records and all 14 CLI configuration definitions. Through the actual UI, `GET /meta` returned HTTP 200 and a GraphQL `viewer { login }` query built by field selection returned HTTP 200 without GraphQL errors. Official environment and help tabs opened. No page errors occurred. These read-only requests do not prove all endpoints or permissions; browser authorization and real account/config mutations remain unverified.
