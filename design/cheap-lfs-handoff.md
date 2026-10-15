# Cheap LFS handoff

Work stopped at the user's request on 2026-10-15. No detailed Cheap LFS Electron acceptance run occurred. Preserve all source, fixtures and worktree history; do not delete recovery copies or pending work.

## Preserved work

The isolated worktree is `/workspace/material-git-cheap-lfs`, branch `codex/cheap-lfs`. Implementation checkpoint `7c75a82` retains verified OCI source copies through stage/commit recovery and was integrated by the parent. Opt-in GUI fixture checkpoint `7c72aff` adds `tests/cheap-lfs-workspace.browser.mjs`; it is a descendant of `7c75a82` and was not run. The parent reported its integrated source checkpoint as `56fac29` before starting a second full suite; this handoff does not assert that suite's result.

The GUI fixture uses the actual built Electron application and native Git/Cheap LFS IPC, with only the native folder-picker choice supplied. It is prepared to exercise local inventory, masked password and Docker credential drafts across navigation, independent regex workbenches, ignored-file review, recovery inventory, and 24 English/Cantonese/bilingual, light/dark, normal/minimum-size, 100%/200% zoom tuples. It records source/build hashes and capture provenance. Run only after the user resumes work and the parent releases the browser/test slot. `MATERIAL_GIT_APP_ROOT` chooses the integrated build and `MATERIAL_GIT_QA_OUTPUT` chooses a fresh output directory.

## Completed focused verification

`npm run check` passed for the OCI recovery source checkpoint. `node --import tsx --test tests/cheap-lfs-oci-recovery.test.ts` passed all six scenarios: staging, successful verified commit, failed commit proof with compare-and-swap rollback, cancelled settlement, concurrent local edit, and cancellation during publication. Those tests use real local payload bytes, actual OCI image construction and digest checks, the real tracked-path store, actual Git index/commits and local restoration; only the registry gateway is injected. They establish no live registry permission or publication result. `node --check tests/cheap-lfs-workspace.browser.mjs` passed syntax validation only.

## Open acceptance and visual issue

The user's latest report of oversized elements and overlap remains open. No reproduction, correction or successful screenshot acceptance is claimed here. Static inspection also identified a possible narrow bilingual-button overflow in `src/renderer/cheap-lfs.ts`: long Material button labels lack the explicit maximum-width/wrapping rules used by Build Tools. Confirm it in the actual built app, especially 760×600 at 200% zoom, before making an evidence-based layout correction. Preserve failing captures and rerun the relevant tuples after any change.

## Functional and external limits

The integration implements the custom Cheap LFS Release and OCI formats, native Release/GHCR/Docker adapters, pinned ORAS acquisition, protected credential setup, reviewed stage/commit coordination, source retention, history, encryption, atomic restore, local ignored-file preservation and public compression workflow preparation. It never installs or configures standard Git LFS or clean/smudge filters.

Private cloud compression remains explicitly unavailable: the pinned upstream defines external encrypted-builder registration requirements but supplies no supported provisioning/execution operation. Public compression prepares an owned workflow with the actual pinned worker and requires reviewed commit/push. Live external payload publication, provider account permissions and quotas, organization/private-public policy transitions, Windows execution and Windows protected-storage behavior remain unproved. Do not describe the entire requested feature or final GUI acceptance as complete.
