# FFmpeg source build checkpoint

The existing upstream static binaries link external libraries whose exact corresponding-source payload is not available from their linked release-source pages. The replacement recipe uses FFmpeg 9.0.2 and only the codec libraries needed by the application presets. Exact source archives, versions, upstream URLs and SHA256 values are reviewed in `data/ffmpeg-source-build.json`.

The isolated Linux Docker toolchain uses a digest-pinned Debian Bullseye image and signed 2025-01-01 Debian snapshots. It compiles Linux x64 and Windows x64 without network access during compilation, without host-wide installation, and with process/memory/CPU bounds. This preparation checkpoint does not yet replace the runtime engine manifest. Normal acquisition refuses missing reviewed output hashes; `--bootstrap` produces only isolated candidate payloads for review. Native Windows execution remains a separate build-verification requirement.

Next verification steps are to complete both actual compiler runs, pin the emitted payload hashes, archive all exact preferred-source inputs and build/configuration scripts, require that archive in fetch/package validation, and bind Linux CI artifacts to the same Windows workflow run and commit. No source-only tarball is represented as corresponding to the old broad static builds.
