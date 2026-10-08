# Bundled converter dependency research checkpoint

## Dependency security update

The original dependency findings below are superseded by pinned DOMPurify 3.4.16, fast-xml-parser 5.11.2, YAML 2.9.1 and fflate 0.8.3. Existing development dependencies were updated to Electron Packager 20.3.0 and Vite 7.3.7, both compatible with the Node 24 toolchain. The complete npm audit, including development dependencies, reports zero findings. PDF/image packages retain their previously pinned versions. Converter worker and engine implementation remains separate work; Windows packaging has not been exercised with the updated packager.

Implementation paused before converter-engine source, download helper, worker or export serializer changes. Only pinned npm dependency preparation and upstream read-only research were completed. This checkpoint must not be treated as a finished converter implementation or integrated without dependency review.

## Prepared npm dependencies

The lockfile records pdf-lib 1.17.1, yaml 2.8.1, fast-xml-parser 5.3.0, fflate 0.8.2, pngjs 7.0.0 and jpeg-js 0.4.4. Installation used `--ignore-scripts --no-audit --no-fund`; no binaries, global tools or models were installed. PNG/JPEG decoding was planned for a fixed application worker using pngjs/jpeg-js rather than native libvips.

A subsequent production audit reported a critical advisory for fast-xml-parser and moderate advisories for yaml, fflate and the existing DOMPurify dependency. These findings block integration of this checkpoint. At the research timestamp, the registry reported yaml 2.9.1 and fast-xml-parser 5.11.2 as current versions; their security status and compatibility were not yet verified. Resume by selecting exact fixed versions, updating the lockfile, inspecting licensing and rerunning production audit before implementing parsers. No engine imports or adapters use these new dependencies yet.

## Verified upstream release asset identities

The following SHA256 values were read from GitHub's public release asset `digest` metadata. Downloaded-byte verification and executable smoke tests have not yet occurred.

FFmpeg/FFprobe static build release `b6.1.1`, upstream https://github.com/eugeneware/ffmpeg-static/releases/tag/b6.1.1:

| Asset | SHA256 |
| --- | --- |
| ffmpeg-linux-x64 | e7e7fb30477f717e6f55f9180a70386c62677ef8a4d4d1a5d948f4098aa3eb99 |
| ffmpeg-win32-x64 | 04e1307997530f9cf2fe35cba2ca7e8875ca91da02f89d6c7243df819c94ad00 |
| ffprobe-linux-x64 | 4f231a1960d83e403d08f7971e271707bec278a9ae18e21b8b5b03186668450d |
| ffprobe-win32-x64 | 3a7e2dc003dc2cd1472827e4c7c4f056ae1ae0ae7c5bbc580c99b49827351ba4 |
| linux-x64.LICENSE | 8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903 |
| win32-x64.LICENSE | 8ceb4b9ee5adedde47b31e975c1d90c73ad27b6b165a1dcd80c7c545eb65b903 |
| linux-x64.README | 72f4b1b06d419d22ace6e7cc75f06826f90737345aa0b1736158929f4aacc537 |
| win32-x64.README | a636a7183c58006351acbaf35303c0ed85c6e1320fd4e80de453ba6157de6311 |

Exact download URLs use `https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/` followed by the asset name above. The license assets and build README must be downloaded, verified and shipped; license obligations and corresponding-source availability must be reviewed before packaging.

Official 7-Zip release `26.04`, upstream https://github.com/ip7z/7zip/releases/tag/26.04:

| Asset | SHA256 |
| --- | --- |
| 7z2604-linux-x64.tar.xz | fc0327ba27e89bd086cf426dff17d77de582953cdbbc10a6576540a06853ffcd |
| 7z2604-extra.7z | dc4b11d3399db18b063630137145f5585d8f7ac847bf3639bd1185d7d1f7cee0 |
| 7zr.exe | 256feca8e274e5da655e2a284fabafd9f554365eb164862089dacd4e8276d282 |

Exact download URLs use `https://github.com/ip7z/7zip/releases/download/26.04/` followed by the asset name above. Planned extraction is limited to explicitly named executables and upstream license files. Linux would use official 7zz; Windows would bootstrap the verified extra archive with verified 7zr and ship its x64 standalone 7za. Extracted executable hashes still need recording after actual verification.

## Proposed integration contracts, not implemented

A fixed `src/main/bundled-engines-worker.ts` would be a separate esbuild entry producing `dist/main/bundled-engines-worker.cjs`. `createBundledEngines({vendorDirectory, workerPath})` would return a facade that enables only app-owned engines with verified receipts. Root build/package scripts would call a reproducible `fetchConverterEngines` helper and copy verified executable/license payloads, with no PATH discovery.

A shared export helper would expose `ExportFormat`, `exportFormats(data)` and `serializeExport(data, format, options?)`, returning `{text, mime, extension, disclosures}`. Proposed formats are JSON, JSONL, YAML, XML, CSV, TSV, HTML, SQL, Markdown and plain text. Exact format support and lossless behavior remain undecided pending implementation and tests. CSV/TSV need formula handling and explicit nested-value behavior. SQL requires a typed table-name schema and literal encoding; no supplied SQL or executable code may run.

PDF operations need operation-specific controls and reopening checks for page count/order/rotation/metadata. Archive work needs path traversal, symlink, depth, entry-count and expanded-byte limits. Encryption must not place passwords in argument arrays, journal/history, snapshots or logs; whether official 7za/7zz can accept the password through controlled stdin still needs a real fixture test. FFmpeg requires fixed presets, file-only protocols, owned temporary files, thread/byte/time limits and output probing. No arbitrary engine arguments may cross the renderer bridge.

Unlimited conversion queues, offline engine packaging, native-image process isolation, editor handoff and all corresponding fixtures remain unimplemented in this checkpoint. Existing converters remain in their prior truthful availability state.
