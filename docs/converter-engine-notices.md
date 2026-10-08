# Bundled converter engines

Only Linux x64 and Windows x64 native engine artifacts are currently supported. Other architectures keep native media/archive adapters disabled. All URLs, upstream asset SHA256 values and extracted executable/license SHA256 values are pinned in `data/converter-engines.json`. Runtime adapters require the app-owned payload, exact manifest hashes and a platform-matching receipt. PATH discovery never enables an engine.

## FFmpeg and FFprobe

Native binaries are source-built FFmpeg/FFprobe 9.0.2-material-git-1. Exact FFmpeg/x264/libvpx/LAME/Opus/libogg/libvorbis sources, versions, URLs, SHA256 values and build recipes are pinned in `data/ffmpeg-source-build.json`. The separately reviewed executable, configuration, license and complete source-bundle hashes are in `data/converter-engines.json`.

The combined codec builds are distributed under GPL version 3 or later. Packaging includes the complete preferred-source archives, actual build/control scripts, configuration, toolchain package versions and each codec's upstream notices in `corresponding-source.tar`, plus the source-build proof and readable notices beside each executable. Compiler runtime notices/exception text are retained. The standard operating-system C/math/threading and compiler runtime components are system libraries/toolchain components. The [source-build workflow](ffmpeg-source-build.md) documents local reproduction and same-run Linux-to-Windows delivery. The old broad upstream static distributions are not covered or used by this source bundle.

Media execution allows only local file protocols, fixed codecs, bounded input/output bytes, duration, dimensions, thread count, temporary storage and deadline. The application never passes arbitrary user arguments, remote URLs, shell commands, environment expansion or filter expressions. FFprobe reopens actual emitted outputs. Supported presets are WAV/MP3/FLAC/OGG audio and MP4/WebM/MKV video, subject to actual available source streams and bounds.

## 7-Zip

Official 7-Zip 26.04 binaries and license files come from https://github.com/ip7z/7zip/releases/tag/26.04. Source is published by the same official project at https://github.com/ip7z/7zip/tree/26.04. Linux uses 7zz; Windows uses x64 7za from the official extra archive, extracted with the separately verified official 7zr bootstrap. The license declares LGPL portions, BSD portions and the unRAR restriction. The complete upstream license and exact official source archive are shipped as `7zip.LICENSE` and `7zip.SOURCE.tar.xz`; executable bootstrap/archive downloads stay in the build cache.

Native 7z/ZIP creation exposes only fixed semantic schemas for compression method/level, dictionary memory, solid mode, threads, volume size and content/header encryption. ZIP does not support solid mode or encrypted filenames. Passwords enter controlled stdin prompts, never argument arrays, process listings, snapshots, logs or durable history. Actual native encrypted-header round trips were verified using synthetic fixtures. Readers omit the `-p` empty-value argument because 7-Zip treats it as an empty password; the reader's prompt receives the password through stdin instead.

Extraction validates names, entry sizes, links, duplicate paths, count and expansion before returning bytes. New output names are flattened and remain inside the user-approved destination prefix. Neither extraction nor conversion overwrites or changes sources.

## Bundled JavaScript codecs

PDF, structured data, ZIP and raster adapters use a separately built fixed worker containing locked npm dependencies: pdf-lib, YAML, fast-xml-parser, fflate, pngjs and jpeg-js. Their upstream license text is collected by the repository's production dependency notice helper. Image decode runs in this bounded worker rather than the privileged Electron process. Worker heap, stack, input, output and time limits are explicit. Native child resident-memory monitoring is available on Linux; equivalent hard operating-system memory containment on Windows remains a packaging/runtime verification boundary.
