# Local converters

The Utilities workspace contains a native file converter and the inline text, colour, time and unit workbench. Both use registered Material components. English, Cantonese and bilingual primary controls follow application settings.

## File conversion

The main-process `LocalToolsService` receives native picker callbacks. A selected regular file is read with a 32 MiB limit, inspected by its byte signature and strict UTF-8 decoder, and retained as an opaque source grant. The renderer receives an ID, basename, size, detected type, bounded preview and compatible adapters. It never chooses an arbitrary filesystem path. A SHA256 binds the grant to the selected bytes; changing the source requires selecting it again.

Bundled source and Node runtime provide actual JSON formatting/compaction, exact-byte Base64 encoding/decoding, strict UTF-8 LF normalization, gzip compression/decompression and 16-bit PCM WAV stereo-to-mono conversion. JSON rejects nonfinite numbers, unsafe integers and more than 100 nesting levels. Base64 validates padding bits. Gzip validates checksum and bounds decompressed output. WAV validates RIFF size, PCM layout, sample rate, channel count and output frame count. The registry discloses formatting, line-ending, metadata and channel changes before conversion.

These codecs run fixed application code in a worker with a 160 MiB old-generation heap bound, 16 MiB young-generation bound, 2 MiB stack and a 15-second deadline. No user code, shell command, filename from an archive, network request or dynamic user dependency is executed by the codec. Worker termination handles cancellation. This is bounded codec isolation, not a claim of an operating-system process sandbox or a total native-memory limit.

PNG/JPEG conversion is enabled only when the main process supplies the bundled Electron nativeImage callback and its runtime proof. Signature-based dimension inspection rejects images above 16 million pixels or 8192 pixels on a side before decode. JPEG is explicitly lossy and flattens transparency; both conversions discard metadata and profiles. Emitted signature and dimensions are checked. Native image decode runs in the Electron process, so complete isolated image decoding remains outstanding.

The adapter browser includes Documents/PDF, Images, Audio, Video, Archives, Structured Data/Spreadsheets, Code/Text and Binary Encodings, each with a scoped search and adjacent regex builder. PDF operations, office/spreadsheets, compressed audio/video and ZIP/TAR/7z remain visible and disabled with exact missing bundled-engine reasons. A developer PATH executable does not establish bundled-package proof and never enables an adapter.

The native destination picker proposes a new format-specific name. Existing destinations and mismatched extensions are rejected. Storage must report at least 64 MiB free. Output is written to an exclusive temporary file, flushed, reopened and compared, then linked atomically to the new destination without overwriting. Sources are untouched. Result records survive application restart, and interrupted conversions are reported as failed with a reselection/retry instruction. Two conversions may run concurrently. History has bounded pages at the service boundary.

An unlimited persistent converter queue, pause/resume, complete PDF editing, bundled FFmpeg/office/archive engines, isolated native image decode, output opening/editor handoff and full history paging in the renderer are still required for the complete universal converter contract. Native picker selections currently enter a bounded per-file workflow rather than an unlimited constant-memory directory queue.

## Inline conversions

The existing workbench encodes/decodes URL components, translates UTF-8 text and padded Base64, formats/compacts JSON, translates Hex/RGB/HSL colours, converts explicit-offset ISO and Unix timestamps, formats named IANA zones and converts length/mass/storage/temperature units. Inputs are bounded to 1 MiB. Invalid results clear stale output. Base64 and URL encoding are not encryption. JSON and scalar arithmetic use JavaScript precision; alpha may be quantized to one byte.

## Verification

`tests/converters.test.ts` covers inline round trips and invalid input. `tests/local-tools.test.ts` runs actual bundled file codecs, worker isolation, native grant and atomic destination behavior, malformed JSON/Base64/WAV and adapter availability. An esbuild-bundled codec artifact was exercised for Base64, gzip and PCM WAV. Protocol fixtures are labeled synthetic and use temporary application-owned files. They do not prove native dialog interaction, packaged-image decoding, Windows installation or accessibility.
