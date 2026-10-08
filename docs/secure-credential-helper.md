# Secure-only credential helper

The native credential helper uses GitHub CLI 2.102.0's keyring schema with the pinned go-keyring 0.2.8 implementation. Its native adapter exports `createSecureCredentialStorage` from `src/main/auth-storage.ts`; it takes the app-owned executable path and optionally the native CLI configuration directory. It derives omitted configuration paths with the pinned CLI's precedence. Tokens enter private bounded stdin, never command arguments or credential environment variables.

`status` probes availability without a credential write. `prepare` returns the exact metadata fingerprint. `begin` accepts an already native-verified host/account/token, protocol and fingerprint, then returns a transaction requiring `finish(true)` after CLI verification or `finish(false)` for rollback. Named and active keyring slots are verified before commit. The original values and metadata remain in native memory until the decision. Failures never invoke the CLI's plaintext fallback.

The helper supports Linux Secret Service and Windows Credential Manager. Missing or inaccessible vaults are unavailable. macOS is unavailable because the pinned backend uses password subprocess arguments. A read-only probe does not promise that a later write will succeed. Hard process or operating-system interruption can leave partial state, and concurrent external edits are not overwritten during rollback. These outcomes must be presented as uncertain.

Build and packaging adapters in `scripts/build-auth-helper.mjs` require exactly Go 1.27.1, locked dependency checksums and reviewed source/executable hashes from `data/auth-helper.json`. The copy adapter includes licenses and corresponding helper source. It does not download a compiler at runtime. Root application wiring and the native token-file review/editor are separate integration steps.

Evidence: eight injected Go vault tests, five native adapter/build checks, reproduced Linux executable hashes, cross-built Linux/Windows x64 and ARM64 artifacts, and an actual read-only Linux probe against an absent isolated bus. No test writes real OS credentials, signs a real account in, or establishes live Windows vault behavior.
