# Cheap LFS integration inventory

Reference: Desktop Material, revision `80e0209a12f41df8a6a80ef52925b52ab9ecb1b0`, MIT. This document is a plan and capability inventory, not implementation or live-provider acceptance evidence.

Cheap LFS stores verified payloads in GitHub Releases or OCI registries and commits its own versioned pointer text. The integration does not install, invoke, configure or depend on Git LFS, clean/smudge filters, or Git LFS pointer storage.

| Reference capability | Material Git implementation boundary | Acceptance boundary |
| --- | --- | --- |
| Release v1 raw, multipart, DEFLATE and encrypted pointers, legacy 2 GiB read and 500 MiB new parts | Pinned parser/serializer and native streaming operations | Canonical fixtures, malformed input and real bytes |
| Immutable Release assets, 1,000-slot buckets, digest-based deduplication, collision-safe UTF-8 names | Account-bound Release gateway and operation reviews | Local protocol fixture; actual provider permissions separate |
| Per-part and whole-source digest, revalidation before publish | Native verified source copies | Changed file, symbolic/hard links and path races |
| Atomic restore without overwriting concurrent user changes, retained recovery | Pinned tracked-path store | Real filesystem success, rollback and conflict fixtures |
| Optional Release AES-256-GCM and scrypt, dual integrity receipts | Native crypto; masked operation password and consent | Wrong password, tampering, bounded parameters, cleanup |
| Optional repository-scoped password vault | Dedicated native secret adapter | Real Windows vault unavailable on Linux |
| GHCR and Docker Hub immutable full snapshots, chunks and retention tags | OCI image, key, runtime and transport modules | Real local registry fixture; live permissions separate |
| Private OCI AES-GCM/HKDF, exact tracked key ID, historical key resolution | Key lifecycle and commit-tree proof | Private and public fixtures; provider visibility must be live verified |
| Exact registry/source association and matching visibility | Selected-account policy adapter | Unknown visibility fails closed; no assumed package visibility |
| Adaptive chunk retries, maximum three upload lanes | Bounded operation scheduler and progress | Cancellation, timeout, accepted-blob reuse and no premature tag move |
| OCI survivor snapshot on removal, explicit provider migration | Native reviewed mutation with full object inventory | Old immutable history retained; edited/unmaterialized migration refused |
| Inventory from working tree, index and HEAD | Approved native Git grant; bounded reads | Materialized versus modified distinction and stale review |
| Automatic pin over 100 MiB, partial failures and partial-file refusal | Existing reviewed commit coordinator | Preserve draft and selection; raw failed files excluded explicitly |
| First publish create-only anchor and empty-repository bootstrap | Existing reviewed Git publication flow | Exact remote tip proof; no implicit upload before anchor |
| Exact private key staging and post-hook commit-tree proof | Existing native commit implementation | Compare-and-swap rollback, no key-only failed publish |
| Retained-source postcommit restore and unchanged-payload omission | Native commit completion | No redundant download/upload; preserve concurrent user edit |
| Clone/open/fetch/pull restoration and repository queue cancellation | Repository lifecycle integration | Single shared scheduler, batch outcome and retry |
| Two download lanes with exact 90% look-ahead | Shared restore progress coordinator | 899/1000 versus 900/1000 and nested lane ceiling |
| Manual browser upload, collision-safe staging, verification and resume | Reviewed native handoff and exact provider URL | No automatic encryption fallback; owned cleanup only |
| Public compression caller and private encrypted builder registration | Reviewed workflow preparation, separate publication | Private reference intentionally stops at builder-unavailable; no invented provisioning |
| Ignored submodule preservation, scratch exclusions and crash recovery | Native tracked-path inventory and local exclude integration | Never upload scratch; no deletion based on filename alone |
| Asset version provenance and best-effort postcommit labels | Immutable pointer history and label-only update | Annotation failure cannot invalidate successful commit |

## User workflow

The repository's Large files destination opens one productive manager. A searchable file inventory shows path, provider, logical size, local state and encryption/compression state. Each row offers verified restore and explicit removal review. A toolbar provides refresh, pin selected files and restore all. Provider settings, password actions and compression setup are subordinate panels, never command-entry forms. Work stays bound to its repository when tabs change.

An operation panel shows phase, current path, actual byte counts, queue, successful/failed counts, elapsed time and cancel. The release restore panel distinguishes current and look-ahead lanes. Progress does not reach accepted success from bytes-sent alone. A review lists exact local paths, source identity, provider, intended publication and irreversible consequences before mutation.

Real Material Web controls, visible focus, keyboard reachability, wrapped long paths, reduced motion, English/Cantonese/bilingual labels and native host typography apply throughout. Independent inventory search uses the existing anchored full regex builder. Password inputs are masked, have clear controls, are never persisted into ordinary settings/history, and clear after an operation.

## Ownership and integration

This lane owns new `src/main/cheap-lfs/`, `src/shared/cheap-lfs.ts`, `src/renderer/cheap-lfs.ts`, focused tests and this design/article. The integration owner wires approved-worktree resolution, selected-account transport, IPC registration and native lifecycle into existing central files. The repository-tabs owner wires the manager into its destination catalog. Neither central app routing nor workspace schema belongs to this lane.

## Evidence policy

Reference tests and screenshots are historical reference evidence only. New implementation needs current type checks, real-byte native fixtures, action/feature inventory checks and genuine built Electron interaction. A Linux fixture cannot establish Windows credential-vault, installer, GHCR organization permission, Docker plan/quota, or live private-public visibility behavior. No external uploads are authorized by this inventory.
