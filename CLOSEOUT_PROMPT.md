# Current closeout prompt

Complete the scoped preservation and integration pass for Ding-Ding-Projects/material-git. Do not begin new public documentation implementation in this pass.

## Current source and verified checks

The public `main` source is `e1fc51556f064add017578e7f42bf3a8f95a26ce`. The task-owned documentation source is `a958012f252944709b6222fa9c3f37fe9e563a16` on `ai/feature/20261018-public-docs-delivery`.

At that task source, `node scripts/build-site.mjs` generated 291 documentation articles, zero Wiki articles, and 21 historical captures. `npm run check` passed, `site/build.test.mjs` passed 5/5, and `site/document-links.test.mjs` passed 2/2. The build receipt reports no current capture source, zero current captures, 21 historical captures, and an unavailable Wiki. These checks prove local source/build behavior only.

## Remaining blockers

- GitHub Pages is not configured. The Pages endpoint returned HTTP 404, and the repository `homepageUrl` is empty.
- The Wiki is enabled, but its Git source has not been initialized and no Wiki content is bundled.
- No current native application capture is available. Historical captures do not satisfy current visual acceptance.
- No live home page, deployed asset, complete internal navigation, interactive persistence, or About-field readback has been verified.
- Windows release run `39103223620` succeeded but did not publish a new release. The latest release remains 0.44.1 from `e1fc51556f064add017578e7f42bf3a8f95a26ce`. The installed application remains 0.16.1; the supported update launch was rejected by host policy before startup, with no installation change.

## Safe closeout steps

1. Integrate only the reviewed design handoff, using its neutral public filename, and verify the exact `main` ref.
2. Preserve the incomplete documentation source on its task-owned ref. Do not integrate or publish that unfinished source as a completed delivery.
3. Create and read back the required OneDrive archive before removing any exact task-owned candidate. Delete only after ownership, archive, and ancestry are verified. Keep incomplete, recovery-only, user-owned, and uncertain refs.
4. Update issue #3 with the exact source checks, ref state, and external blockers. Keep it open until the live home, Wiki, homepage field, and required built/live acceptance are verified.
5. Preserve `README.md` without a new public URL until an exact deployed URL is verified.
