# Current closeout prompt

Complete the authorized preservation, integration, archive, ancestry, and safe cleanup work for Ding-Ding-Projects/material-git. Do not begin new public documentation implementation in this pass.

## Current state

The reviewed design handoff from `b2869ea9a822921f76f509f4a0fd8fc49f83f4df` is on local `main`, with the current path `design/public-documentation-reference.md`. The incomplete public documentation source is preserved on `ai/feature/20261018-public-docs-delivery` at `b2c98be1dbd00d842a33002d455d7221560ff53d`; do not integrate it as complete delivery.

At source `a958012f252944709b6222fa9c3f37fe9e563a16`, the local builder generated 291 documentation articles, zero Wiki articles, and 21 historical captures. `npm run check` passed; `site/build.test.mjs` passed 5/5; `site/document-links.test.mjs` passed 2/2. The build receipt has no current capture source, zero current captures, 21 historical captures, and an unavailable Wiki. These results cover local source and build only.

GitHub Pages is unconfigured; its endpoint returned HTTP 404, and `homepageUrl` is empty. The Wiki is enabled but its Git source is uninitialized, with no Wiki content bundled. No live home, current application capture, complete deployed navigation, visitor-state persistence, or exact About-field readback is verified.

The latest verified release is 0.44.1 from `e1fc51556f064add017578e7f42bf3a8f95a26ce`. Windows run `39103223620` succeeded on a task ref and did not publish a release. The installed application remains 0.16.1; the supported updater launch was rejected by host policy before process start, and no installation files changed.

## Closeout steps

1. Commit and push the incomplete task ref for preservation, then read back the exact ref.
2. Push the completed design handoff and closeout records to `main`; verify the exact main SHA.
3. Monitor the resulting Windows release run and GitHub Pages deployment state. Report the exact terminal result without inferring deployment or a new release.
4. Create and read back the required OneDrive archive before any deletion. Include the `.git/` administrative directory and exactly tracked plus nonignored files from the primary and linked working trees.
5. Delete only task-owned refs whose source tips are proven ancestors of pushed `main`. Retain incomplete, recovery-only, user-owned, other-task, active, load-bearing, and ownership-uncertain work.
6. Update issue #3 with exact refs, verification, archive result, cleanup result, and remaining blockers. Keep it open while GitHub Pages, Wiki content, current captures, or homepage readback remain incomplete.
7. Do not add a README URL until the exact deployed home URL has been verified.
