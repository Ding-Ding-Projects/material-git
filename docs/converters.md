# Local converters

The Utilities workspace contains the native file converter and the inline text/colour/time/unit workbench. The file adapter registry exposes Documents/PDF, Images, Audio, Video, Archives, Structured Data/Spreadsheets, Code/Text and Binary Encodings. Missing or unsupported engines remain visible with exact reasons. Primary controls support English, Cantonese and bilingual settings.

## Native file capabilities and output

Native pickers issue opaque grants, not renderer-selected paths. Main-process signature inspection and strict UTF-8 decoding detect source type. Each selected source is limited to 32 MiB, and its SHA256 binds subsequent conversion to the selected bytes. User changes require reselection. Preview is bounded. The renderer chooses semantic adapters/options and native-approved destinations; it cannot send executable paths, shell text, arbitrary flags or remote endpoints.

Every operation has a 64 MiB aggregate input/output bound, at most 250 inputs/outputs and two concurrent admission slots. The source remains unchanged. Destination names must have the selected format's extension. Storage preflight requires 128 MiB free. Outputs are written to exclusive temporary files, flushed, reopened and byte-compared before exclusive links publish them. Existing destinations are refused. Split pages, extracted entries and archive volumes derive separate names from the reviewed prefix. If a multi-file commit fails, the operation removes only outputs it created; existing files are untouched.

The disk-backed queue has no total-record cap. Native-approved destinations, grant IDs and semantic options are persisted per operation. Queue discovery and history paging use directory iterators rather than loading every record. At most two admitted jobs consume bytes. Pause stops further admission after active jobs settle; Resume revalidates sources. Queue startup always requires explicit resume. Interrupted jobs refuse existing destinations, preserving prior outputs for review rather than guessing that partial work succeeded. Password-bearing operations run immediately and cannot enter durable queue records.

Native picker admission still returns the platform's selected-file array and previews; an unlimited paged directory-discovery picker remains a boundary. The unlimited claim applies to durable queue records, not unlimited source bytes, output bytes or decoder memory.

## Bundled engines

`data/converter-engines.json` pins exact source-built FFmpeg/FFprobe and official 7-Zip executable, source and license hashes for Linux x64 and Windows x64. The [media source-build workflow](ffmpeg-source-build.md) provides all exact codec source archives and reproducible compiler/control scripts. `scripts/fetch-converter-engines.mjs` streams bounded downloads, checks SHA256 before extraction, checks named extracted files, smoke-tests native versions and creates the platform receipt. Configured proxy environments use Node's environment-proxy support. Download archives and binaries stay outside Git.

Build creates a separate fixed `bundled-engines-worker.cjs`. Packaging unpacks and byte-compares the fixed worker for native worker-thread loading and includes verified native executables, complete preferred-source payloads, upstream licenses, platform README, receipt, manifest and [engine notices](converter-engine-notices.md). Adapters enable only when the worker or app-owned native receipt and hashes are available; PATH-discovered tools never enable formats. Windows packaging must run on Windows and reverify packaged hashes. The real Windows installer and native Windows memory-containment evidence remain pending.

## PDF operations

Bundled pdf-lib provides inspection, split, merge, extract, reorder, rotate and metadata editing. Inspection supplies actual page count and metadata. Page selectors use verified 1-based pages, output-position controls and reverse order. Merge has explicit source order. Rotation is an enumerated 0/90/180/270 degrees. Title, author and subject begin with the inspected values and remain editable.

Reopening verifies page count, content-stream fingerprints/order, dimensions, rotation and metadata. PDF outputs are limited to 250 pages and aggregate byte bounds. Encrypted, signed, active-content, embedded-file and form PDFs are rejected with the exact unsupported boundary. Metadata/structure changes are disclosed. This does not promise preservation of every advanced PDF feature.

## Images

PNG/JPEG decode and encode use locked pngjs/jpeg-js in the isolated worker, replacing privileged native image decode. Signature/dimension checks run before decoding. Limits are 16 million pixels, 8192 pixels per side, strict CRC/JPEG checks and a bounded JPEG decoder memory budget. JPEG exposes a 1–100 quality slider and discloses loss, alpha flattening and removed profiles/metadata. Outputs are decoded again and their dimensions checked. PNG retains raster alpha/pixels while dropping metadata/profiles.

## Structured data and exports

JSON, JSONL, YAML, typed XML, CSV and TSV imports are guided by an explicit source-grammar picker and strict parser validation. JSON-compatible values have bounded depth/count and reject unsupported types, prototype keys, unsafe integers and nonfinite numbers. YAML aliases are rejected; XML rejects DTD/entities, processing instructions and malformed syntax. XML supports the app's typed JSON schema, not arbitrary office/XML schemas.

JSON/JSONL/YAML/XML outputs undergo semantic round trips. CSV/TSV disclose scalar-type loss and JSON encoding of nested cells; formula-like cells receive an apostrophe safety prefix. HTML escapes JSON inside a scriptless document. SQL emits only quoted-identifier, escaped-literal INSERT text for a validated table name and never executes it. Markdown/plain text are available where meaningful. `shared/exports.ts` exposes per-datum format availability; registered `mg-export-menu` presents applicable formats and disclosures before the native save action. Root integrations must retain their credential/path redaction before serialization.

Office DOCX/XLSX/ODT rendering remains unavailable without a verified bundled office engine. No unavailable office format is represented as converted.

## Archives

Bundled ZIP handles stored/deflated archives with safe paths, bounded entry count/expanded bytes, no symlinks/ZIP64/encryption, strict actual inflation lengths and CRC verification. Creation reopens and compares source bytes. Extraction writes flattened new output names and discloses metadata/directory loss.

Verified official 7-Zip exposes ZIP/7z creation and safe extraction. Rich controls include compression method/level, dictionary size, solid mode, one-to-four threads, volume size and content/header encryption. ZIP header encryption and solid mode remain unavailable with exact reasons. Native creation integrity tests, lists and extracts entries to compare exact source bytes. Native encrypted-header fixtures use controlled stdin; passwords never enter arguments, process listings or history. Multi-volume archives can be created and validated together. Importing external multi-volume sets still requires additional source-part reconciliation.

## Media

Verified FFmpeg/FFprobe provide fixed WAV/MP3/FLAC/OGG audio and MP4/WebM/MKV video presets. Source signatures, actual stream inventory, reported duration and dimensions gate execution. Limits are 300 seconds, 4096 pixels per side, 8.3 million pixels per frame, 64 MiB output, four threads and a 90-second process deadline. Only local file protocols and allowlisted demuxers are permitted. Arbitrary codecs, filters, flags and remote URLs cannot cross the bridge.

Output probing checks valid streams, duration and dimensions before bytes are offered. Metadata, additional tracks, subtitles/data and lossiness are disclosed. Output reaching a byte cap or failing duration validation is refused. Native temporary storage and Linux resident memory are monitored; worker heap/stack/deadline limits remain explicit. Complete Windows OS memory containment and a least-privileged OS decoder sandbox remain outstanding boundaries.

## Verification

Synthetic fixtures use only temporary app-owned data. Executable tests cover typed structured round trips and injection rejection, every PDF operation, isolated PNG/JPEG, ZIP CRC/size/path boundaries, native 7-Zip creation/extraction/encryption, real FFmpeg audio/video, native opaque grants, multi-output atomic publication and durable queue restart/resume. Linux engines were actually downloaded and verified; native engine tests skip with an exact reason when those payloads are absent. Full npm audit, including development dependencies, reports zero findings after fixed-version updates. Source checks and Linux fixtures do not prove Windows installation, native dialogs, accessibility or packaged graphical behavior.
