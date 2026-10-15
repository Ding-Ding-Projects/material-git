# Large files with Cheap LFS

Material Git can keep payloads in GitHub Release assets, GHCR, or Docker Hub and commit small, versioned Cheap LFS pointers. Each pointer identifies immutable stored bytes and their size and SHA-256. The protocol is compatible with Desktop Material revision `80e0209a12f41df8a6a80ef52925b52ab9ecb1b0`, whose MIT attribution accompanies the native modules. It does not install or configure Git LFS or Git clean/smudge filters.

Open an approved repository workspace, then **Large files**. Choose **Pin files** or select inventoried paths, inspect the exact operation review, and apply it. The app uploads and verifies bytes before replacing a file with its pointer. Commit the returned pointer paths together; private OCI storage also requires its exact tracked repository key. Use **Restore** to materialize and verify the original payload. An edited destination is preserved rather than overwritten.

## Storage choices

| Provider | Storage and credentials | Limits and behavior |
| --- | --- | --- |
| GitHub Releases | The repository's selected GitHub account; public reads can use an anonymous session | Normal published storage releases, exact ownership marker, new parts up to 500 MiB, 1,000 assets per bucket. Historical 2 GiB parts remain readable. |
| GHCR | Selected GitHub account with the provider's required package permissions | Immutable OCI manifests and chunks, retained historical references, verified source/package association and matching visibility. |
| Docker Hub | Username and access token saved through the protected credential fields | Immutable OCI snapshots with verified repository policy. Provider plan, quota and permissions are checked by the actual service; having a token does not establish them. |

OCI transfers acquire the pinned ORAS 1.3.2 runtime when needed. Archive, executable and license hashes are checked before execution. Linux x64 and arm64 artifacts and the Windows x64 artifact are pinned; Windows arm64 follows the x64 compatibility route. A verified cache can be reused offline. Network transfer still requires provider access. A damaged cache is preserved and refused.

## Stage, commit and first publication

Automatic pinning prepares selected raw files over 100 MiB and edited files already managed by Cheap LFS. The normal Git review identifies the provider, repository and upload size before applying that effect. Failed uploads are excluded explicitly. Whole-file pinning cannot replace a partially selected file.

The coordinator distinguishes working payloads from pointers already staged in Git. A newly staged pointer remains staged when its verified payload has been materialized over it. An unchanged payload whose pointer is already committed is omitted from the commit. Private keys and required pointer bytes are verified in the resulting index or commit. A changed post-hook commit fails the proof; rollback uses compare-and-swap so a concurrent new HEAD is preserved.

Release storage needs a commit that the remote already has. Use **Review repository publish or push** to reach the normal publication review. An unborn repository needs a reviewed initial commit or empty publication anchor before its branch can be pushed. The upload service refuses to invent a remote anchor or upload against an unverified local-only tip.

Verified retained source copies restore local bytes after successful staging or committing, and after failed or canceled preparation. If a concurrent edit prevents restoration, that edit remains and the original copy is retained with an explicit recovery location. Recovery records are local; copies under the operating system's temporary directory should be recovered before external cleanup removes them. Automatic restore after repository updates honors the repository preference and acts only on intact pointers.

## Encryption and passwords

Release payload encryption uses the pinned scrypt and AES-256-GCM container format. Both stored ciphertext and restored plaintext have integrity receipts. Enabling encryption requires the same password twice and acknowledgment that there is no password reset or recovery key. Pointers still disclose plaintext size and SHA-256. Losing the password makes encrypted payloads unrecoverable.

Password inputs are masked. An operation can use a password without saving it; optional saving uses the native protected credential store. Docker tokens use a separate protected record. These values are excluded from ordinary settings and history. Private OCI uses the tracked repository key required by its immutable snapshot; keep that key in the same verified commit as its bound pointers.

## Manual upload, compression and ignored files

Manual Release upload prepares verified local files, opens the exact provider release editor and native handoff folder, then checks the provider's accepted bytes before creating pointers. This route is available for unencrypted Release payloads. Cancellation can leave an accepted immutable asset available for retry.

Public cloud compression prepares a real, reviewed GitHub Actions workflow with pinned worker bytes. It operates after the workflow is committed and published. It retains original assets needed by historical pointers. Private cloud compression is **unavailable**: the pinned reference provides leak-checked external builder registration requirements, but no supported provisioning or execution route. Inspecting those requirements does not start compression, provision a builder, or install a workflow into a private repository.

**Preserve ignored files** is a local operation. Git proves the selection is ignored; the app copies and hashes it, creates a local submodule and its initial commit, and stages registration in the parent. Every original remains in place. Independent recovery copies are retained when a proof fails. This phase creates no provider repository, remote, upload or push. Review the parent changes separately.

Each inventory and settings subpanel has its own search state and regex builder. Long paths wrap; active transfers show actual byte progress, current and look-ahead restore lanes, queue counts and cancellation. Password and review drafts stay with their repository while navigating tabs.

## Verification and limits

Current native evidence includes real filesystem and Git fixtures, loopback HTTP transfers of actual bytes, immutable historical restoration, authenticated encryption with wrong-password preservation, exact staged-pointer preservation, compare-and-swap rollback, local ignored-file preservation, and official Linux ORAS acquisition, hash verification and execution. These tests establish the tested native behavior. They do not establish live GitHub or Docker account permission, quota, organization policy, private/public visibility transitions, Windows execution or Windows protected-storage behavior. No live external payload publication was performed for these fixtures.

[Git workflows](git-workflows.md) · [Implementation and acceptance inventory](../design/cheap-lfs.md) · [粵語](cheap-lfs.yue.md)
