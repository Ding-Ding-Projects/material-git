# Exact media engine source and build

The media executables are built from FFmpeg 9.0.2 and seven exact upstream source archives: FFmpeg, x264, libvpx, LAME, Opus, libogg and libvorbis. `data/ffmpeg-source-build.json` records their versions, URLs, licenses and actual SHA256 values, together with the reviewed build scripts and emitted binary/configuration/license hashes. `data/converter-engines.json` also pins each platform's complete corresponding-source archive and source-build proof.

The old broad John Van Sickle/Gyan binaries are no longer acquired or enabled. Their linked source pages did not supply the exact full external-library source set. A generic FFmpeg release tarball would not have closed that gap.

## Local build

Use Node 24 and a Linux x64 Docker daemon. No host-wide compiler installation is required. Run `node scripts/ffmpeg-source-build.mjs linux-x64` or `node scripts/ffmpeg-source-build.mjs win32-x64`. The second command cross-compiles actual Windows x64 PE files; it does not execute them on Linux.

The Docker toolchain uses a digest-pinned Debian Bullseye image and signed 2025-01-01 Debian snapshots. TLS verification remains enabled, and historical snapshot signatures remain required. Supply a trusted CA bundle through `CONVERTER_BUILD_CA_BUNDLE` when the default system trust bundle is insufficient. Certificate mounts do not enter the image or source payload. Existing proxy configuration is preserved.

Compilation runs without network access, with read-only source/recipe mounts, a private output mount, an unprivileged matching user, dropped capabilities, no privilege escalation, four CPUs, a four-GiB memory limit, bounded scratch space, process count and deadline. It builds only the required libraries and local-file demuxer/codec presets. No codec source patches are applied. Linux dynamically uses standard C/math/threading libraries and requires glibc 2.31 or later. Windows imports standard Windows DLLs, without separate codec DLLs.

Normal acquisition requires byte-identical reviewed outputs and the exact source archive. `--bootstrap` prepares isolated candidates for reviewing a deliberate version change; it cannot activate an unreviewed runtime payload. Windows build/package consumes the Linux-produced verified artifact and executes actual native CLI version checks on Windows.

## Distributed preferred source

Every platform payload includes `corresponding-source.tar`, `SOURCE_BUILD.json`, FFmpeg's GPLv3 license, all selected codec notices, compiler runtime notices, configuration headers/makefiles and toolchain package versions. The source archive contains every exact upstream source archive plus the actual Dockerfile, build script, acquisition/control helper, manifest, configuration and license text. Standard operating-system and compiler runtime components are treated as system libraries/toolchain components; their applicable runtime notices and exception text are retained.

The official 7-Zip 26.04 source archive is also downloaded by its upstream release-asset SHA256 and included as `7zip.SOURCE.tar.xz`. Neither source distribution depends solely on an external URL offer. Packaging refuses missing or altered source, license or executable payloads. Runtime native engine availability rechecks their manifest hashes and source-build identity.

## Workflow binding

The branches-only release workflow first builds the Windows media payload in a Linux Docker job. Its artifact records the exact checked-out commit, workflow run ID, attempt, engine/source manifest hashes and complete file digests. The Windows job downloads the artifact from the same run and verifies that identity, both manifests, every expected file and the absence of extra payloads before the existing `build.bat /s` and `build-installer.bat /s` entrypoints.

The repository's scoped `.gitattributes` forces LF checkout bytes for the two reviewed converter manifests, the three hash-bound recipe files, the recipe's application license and the checksum-bound vendored parser license. This holds even with Windows `core.autocrlf=true`; all other tracked text keeps its existing checkout policy. New checkouts apply it automatically. An existing Windows worktree must refresh these tracked files after preserving any local edits. Artifact manifests, executables and source archives are never normalized: verification always hashes their exact received bytes.

A local regression creates real isolated Git repositories/checkouts, reproduces the pre-policy CRLF manifest mismatch and exact import error, then proves both manifest and every recipe/license byte matches the reviewed LF input under the corrected policy. When the reviewed Windows source payload is available it also imports and revalidates that actual payload. Changing an artifact manifest to semantically equivalent CRLF still fails verification.

Branch builds still produce installer/evidence artifacts. Only `refs/heads/main` can publish a release. CI runs build/native dependency verification; it does not run tests, lint or type checking. Local source checks and converter fixtures remain separate. Native Windows smoke tests and installer completion need an actual Windows run; Linux PE inspection does not establish either result.
