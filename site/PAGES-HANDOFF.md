# Public Pages preparation checkpoint

Work stopped at the user's request. This checkpoint is unfinished and has not been deployed.

The intended public home is <https://ding-ding-projects.github.io/material-git/>. The intended gallery is <https://ding-ding-projects.github.io/material-git/#gallery>. The existing private site's audience must remain unchanged.

## Prepared changes

- A main-branch GitHub Pages artifact workflow builds the site and deploys the uploaded artifact. It has not run. The build gate rejects deployment without an explicitly identified current capture source and matching images.
- Site social metadata and the canonical URL point to the intended Pages address. Script, stylesheet and icon URLs remain relative.
- The builder now checks image hashes and source/date receipts, emits an output asset manifest and build receipt, and rejects known private hosting addresses and machine paths in documentation.
- A Markdown renderer prepares internal article routes and heading identifiers. Client-side anchor navigation still needs implementation and verification.
- The wiki status explicitly records an unavailable public snapshot. An anonymous Git query to the public wiki returned “Repository not found.” This does not establish that no private or unpublished wiki exists.

## Pending before publication

1. Review the code and run the focused site build and tests. No build, browser run, or screenshot inspection was completed for this checkpoint.
2. Integrate the documentation owner's removal of private hosting addresses from public articles. The current documentation causes the new privacy guard to reject a build; do not disable the guard.
3. Inspect all 21 historical image originals for account identity and machine paths. Preserve their original source `e464ff70f195dbd9584614b92a9547074e49200d` and capture dates. Exclude unsuitable images from the deployed gallery while retaining the historical records appropriately.
4. Label historical images visibly in the gallery and remove historical imagery from any current product presentation. The existing site component has not yet been updated for these distinctions.
5. Add only reviewed, source-bound final native captures and matching receipt entries. `currentSourceCommit` remains null deliberately. No final capture was received or fabricated.
6. Complete internal article/anchor navigation and the interactive guide, diagram controls and visitor-owned progress checks. Preserve the inventory's 104 requirements and 161 unresolved surface obligations.
7. Build the exact static artifact and verify it under the `/material-git/` base in an isolated headless browser: desktop and emulated mobile, console/network errors, named controls, keyboard paths, overflow, article inventory, anchors, image loading and source provenance. Retain reviewed captures and owned-process teardown evidence.
8. Obtain the publishing owner's review before enabling Pages, deploying, changing repository About metadata, or pushing this work. Verify the live home, assets, gallery, deployment revision and exact About URL before claiming delivery. README/HANDOFF updates belong to their assigned owner.

The latest reported application issue is oversized and overlapping GUI controls. It remains open. This site checkpoint does not reproduce, diagnose or fix that issue.

The historical installer baseline remains separately identified. No new Windows, authenticated provider, live hosting or universal feature-certification claim is made.
