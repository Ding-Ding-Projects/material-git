# Local verification record

On 2026-10-08, the Linux integration checkout passed TypeScript checking, the Electron/Vite production build, 64 Node behavioral tests, and three documentation regex tests. These counts record the verification at the initial integration; later commits may add checks.

Real headless Electron interaction completed a read-only GitHub repository list through command controls. Accounts, updates and settings opened without page errors. A separate isolated profile with no GitHub token verified a known UTF-8 converter result, unavailable Ollama retry behavior, regex matching/captures/replacement/navigation/filtering, and tab keyboard navigation. No mutating GitHub command, model pull/delete or live model chat was used in these checks.

Native Chromium accessibility evidence exposed correctly named tablist/tab roles and selected state. Explicit role attributes also make these accessible to the installed Playwright version. The regex panel's border box remained within the 1420×940 viewport after correcting box sizing. Documentation command search and the 375-pixel layout passed with no horizontal overflow or browser page errors.

Subprocess regressions include argument injection, bounded output, split UTF-8, secret redaction across chunks and the output limit, operation cancellation, and immutable event snapshots. Other focused checks cover real regex worker termination, RFC 6238 TOTP vectors, encrypted-service persistence, shared-record observation, atomic invalid preferences and vocabulary, conversion semantics and REST/GraphQL pagination.

Windows packaging, fresh-machine install/uninstall, browser login completion, update installation, real Windows secure storage and every CLI command remain separate verification obligations. Successful local builds and mocks do not prove them. See [remaining work](verification-gaps.md).
