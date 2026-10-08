# Bundled converter engines

Only Linux x64 and Windows x64 native engine artifacts are currently supported. Other architectures keep native media/archive adapters disabled. All URLs, upstream asset SHA256 values and extracted executable/license SHA256 values are pinned in `data/converter-engines.json`. Runtime adapters require the app-owned payload, exact manifest hashes and a platform-matching receipt. PATH discovery never enables an engine.

## FFmpeg and FFprobe

Native binaries come from the published `b6.1.1` release of the FFmpeg-static distribution: https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1. This distribution release tag is not the embedded FFmpeg version. The verified Linux binaries report FFmpeg/FFprobe 7.0.2-static from https://johnvansickle.com/ffmpeg/. The verified Windows asset README identifies 6.1.1-essentials_build-www.gyan.dev and source commit https://github.com/FFmpeg/FFmpeg/commit/e38092ef93. These exact per-platform versions and upstream sources are pinned in the manifest. The actual executable version is checked before a runtime receipt is written; Windows binaries still require native Windows smoke verification.

The bundled static builds declare GPL version 3 licensing. The manifest pins the distribution's complete LICENSE and platform build README files; packaging ships both alongside the binaries. The official FFmpeg 7.0.2 source release is https://ffmpeg.org/releases/ffmpeg-7.0.2.tar.xz. External codec versions and build configuration are recorded by the shipped upstream README and executable version/configuration output. Upstream static-build source resources are at https://johnvansickle.com/ffmpeg/ and https://github.com/eugeneware/ffmpeg-static. The Windows distribution's upstream build information is retained in its platform README. Redistributors must satisfy GPL corresponding-source requirements for their exact static build, including external codec libraries; these notices are not a substitute for corresponding source.

Media execution allows only local file protocols, fixed codecs, bounded input/output bytes, duration, dimensions, thread count, temporary storage and deadline. The application never passes arbitrary user arguments, remote URLs, shell commands, environment expansion or filter expressions. FFprobe reopens actual emitted outputs. Supported presets are WAV/MP3/FLAC/OGG audio and MP4/WebM/MKV video, subject to actual available source streams and bounds.

## 7-Zip

Official 7-Zip 26.04 binaries and license files come from https://github.com/ip7z/7zip/releases/tag/26.04. Source is published by the same official project at https://github.com/ip7z/7zip/tree/26.04. Linux uses 7zz; Windows uses x64 7za from the official extra archive, extracted with the separately verified official 7zr bootstrap. The license declares LGPL portions, BSD portions and the unRAR restriction. The complete upstream license is shipped as `7zip.LICENSE`; bootstrap/archive downloads stay in the build cache.

Native 7z/ZIP creation exposes only fixed semantic schemas for compression method/level, dictionary memory, solid mode, threads, volume size and content/header encryption. ZIP does not support solid mode or encrypted filenames. Passwords enter controlled stdin prompts, never argument arrays, process listings, snapshots, logs or durable history. Actual native encrypted-header round trips were verified using synthetic fixtures. Readers omit the `-p` empty-value argument because 7-Zip treats it as an empty password; the reader's prompt receives the password through stdin instead.

Extraction validates names, entry sizes, links, duplicate paths, count and expansion before returning bytes. New output names are flattened and remain inside the user-approved destination prefix. Neither extraction nor conversion overwrites or changes sources.

## Bundled JavaScript codecs

PDF, structured data, ZIP and raster adapters use a separately built fixed worker containing locked npm dependencies: pdf-lib, YAML, fast-xml-parser, fflate, pngjs and jpeg-js. Their upstream license text is collected by the repository's production dependency notice helper. Image decode runs in this bounded worker rather than the privileged Electron process. Worker heap, stack, input, output and time limits are explicit. Native child resident-memory monitoring is available on Linux; equivalent hard operating-system memory containment on Windows remains a packaging/runtime verification boundary.
