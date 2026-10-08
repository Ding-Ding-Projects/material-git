# Local Ollama manager

The Utilities workspace independently provides installed models, the official Model Store, reviewed download batches, streamed chat with saved sessions, a reviewed local-service harness and a bundled offline troubleshooter. Model downloads and official catalog refreshes require explicit actions. Implementation verification never downloads a model or installs third-party software.

## Privileged API and local storage

Documented runtime requests use only `http://127.0.0.1:11434`. The legacy bridge permits version, tags, running models, show, copy and confirmed delete through allowlisted methods and fields. Chat and pull use the durable `localTools` service, streamed NDJSON and bounded polling. Request payloads and response/stream sizes are limited, JSON/UTF-8 errors fail closed, redirects are rejected and a fixed local endpoint prevents renderer-supplied servers.

Catalog, pull journals and saved sessions live under the application's private local tools directory. Durable JSON writes replace an exclusive temporary file atomically. These files are not telemetry or public artifacts. Chat names, system prompts and messages are stored locally as user-requested history. Exports require the explicit chat export action and redact known credential patterns and local path patterns. The export warns that freeform content still requires review; no heuristic can identify every secret.

## Model Store

Refresh reads only the official public library and each family's official tag source at `ollama.com`. It follows recognized page links, retains every recognized published tag and fails the whole new refresh if a family exposes no recognizable tag rows. Each response has a SHA256; the combined response identity, successful timestamp, page/family/variant counts and completeness verdict are recorded. A failed/offline refresh preserves the last complete saved inventory and its last-success timestamp.

Current official pages were inspected read-only: the library lists all families on one page and the sampled tag page lists all tags without pagination. Multi-page behavior is tested with clearly labeled official-page fixtures. Refresh is sequential and bounded to 10,000 pages and 8 MiB per page; reaching a bound or changed markup reports incomplete. No curated model suggestions or fabricated installed rows replace the inventory.

Variant-level search uses the complete saved inventory for plain text. The adjacent regex builder filters the displayed page and explicitly names that scope. Family, reported capability, name and reported-size sorting are guided by real catalog data. Installed models have a separate search and real loaded-state information. Exhaustive global regex, installed/running/quantization/size/fit filters, offline stale-age display and full official per-variant explanations remain incomplete.

## Hardware evidence and downloads

Hardware collection reports actual CPU model, logical core count, architecture, total/free RAM and free disk for the detected Ollama model directory when available. An externally configured service can use another model directory. Supported fixed NVIDIA telemetry locations may supply GPU name, capacity and driver; Ollama backend compatibility remains Unknown. GPU capacity is never inferred from running-model usage or a model name.

Every fit verdict includes evidence and unknown fields. A blob larger than 90% of total RAM is conservatively Unlikely. Positive fit classifications require verified GPU/backend, exact parameter/quantization/KV/context information and disk evidence. Missing required evidence remains Unknown. Synthetic tests exercise all four classifications; catalog rows currently lack enough exact runtime metadata for reliable positive fit, which the UI exposes.

A batch contains exact tags only. Review shows reported byte estimates, conservative additional disk estimate, unknown sizes, fit evidence and aggregate known bytes. There is no price, payment, account or checkout. Pull concurrency is configurable from one to three. Per-item state and actual current-blob completed/total byte counts are durable. Interrupted pulls become queued on restart. Retry reconciles current installed tags and lets Ollama reuse content-addressed blobs. Completion requires both a success stream record and the exact installed tag. Partial/failed/cancelled outcomes stay explicit. No failed item removes an installed model.

## Chat

Saved sessions support local browsing, name search, rename, deletion with two acknowledgements and a confirmation slider, and explicit redacted export. New conversations use an actually installed model picker. System prompt, temperature, output-token limit and context-token limit are editable and bounded. Streaming updates are displayed, Stop aborts the request, Regenerate replaces the last user/assistant turn, and any received partial response is saved on cancellation or failure. The most recent 40 messages are sent; saved history is limited to 128 messages and 512,000 characters, with a 128,000-character response bound and one concurrent generation.

Assistant Markdown is sanitized into a scriptless opaque-origin frame. Links, external requests, images, forms and executable provider markup are blocked. Attachment controls remain visibly disabled with their missing capability/decoder/grant requirements and an in-app Vision filter action. Actual capability-gated attachments and crash-persistence of intermediate streaming chunks remain outstanding. The tool tabs preserve their mounted components and unsent drafts when switching between regex, converters and models; parent workspace remount behavior requires separate lifecycle verification.

## Local-service harness and recovery

The built-in profile detects the official Ollama executable only at supported fixed installation locations, then previews the executable basename, fixed `serve` arguments, environment key names and loopback port. It refuses launch when the service is already healthy, the executable is absent, review expires or executable identity changes. Confirmed launch snapshots the stopped profile, uses an argument array with no shell, strips unrelated environment values, sets a loopback host, starts an owned process and verifies local API readiness. Failed readiness stops that owned process and reports rollback. Restore requests stop of only the owned process and retains the snapshot. The harness never downloads software or models and never modifies external service configuration.

Custom harness registration, executable signature verification, full process-exit restoration verification, model-specific harness profiles and a complete configuration snapshot/restore workflow remain incomplete. A process launch is never presented as an Ollama API capability. The offline troubleshooter remains usable alongside saved chat and last verified catalog, with platform-specific recovery steps and a path back to service verification.

## Verification boundaries

The tests use synthetic protocol streams and temporary app-owned files. They verify multi-page catalog/tag completeness and offline retention, response identity, fit uncertainty, pull progress and installed-state reconciliation, streamed chat persistence/cancellation, input allowlisting and resource limits. TypeScript checks and the repository test suite pass. These checks do not establish an exercised local Ollama runtime, real model inference/download, Windows service launch, full localization, interactive accessibility or packaged graphical evidence.
