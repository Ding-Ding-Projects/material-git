# Analyze or repair a failed build

Select a failed build and choose Codex or OpenCode. The automatic approval checkbox starts off and applies only to this run. The existing failed build is never relabeled as successful by a repair command. Review the source changes and run a new reviewed build with fresh output validation before treating the failure as fixed.

## Default: analyze without editing

With automatic approval off, Codex uses its documented read-only sandbox, ignores user configuration and execution rules, and explicitly marks the selected project untrusted for project configuration loading. Its prompt requests a diagnosis and proposed fix. Approval policy is `never`, so requests to leave the read-only sandbox cannot silently gain permission. System or organizational restrictions remain effective and can refuse execution.

OpenCode analysis uses an application-owned configuration directory, disables project configuration and external plugins, and selects a dedicated agent that denies every tool. It analyzes the supplied recipe and redacted build diagnostics without reading or editing source through tools. Provider configuration and available authentication can still prevent a model request. Such failures are reported with the actual CLI exit result.

This background workflow has no interactive terminal approval channel. To request source edits, explicitly enable automatic approval for that run. The application does not pretend that an unanswered approval request succeeded.

## Explicit automatic repair

With the checkbox selected, Codex receives `--dangerously-bypass-approvals-and-sandbox`. OpenCode receives its documented `run --auto` option and an application-owned permission configuration allowing tools. These modes permit commands and source changes with the user's account permissions. They are never inferred from a saved user configuration or silently enabled after a failed analysis.

Before repair, the service preserves the current Git index and regular changed/untracked file contents in a private recovery directory. Deleted paths are recorded. Symbolic paths, files above 64 MiB, more than 128 MiB of changed content, or more than 10,000 changed paths stop preparation. No automatic reset, revert or rollback is performed. The prompt requests the smallest relevant fix, preservation of existing work, and no commits, publication, credential changes or system-package installation. These prompt instructions are task scope, not a substitute for the explicitly selected execution mode.

Build diagnostics and the selected recipe go to the CLI over standard input, not command arguments. Known credential patterns and matching secret environment values are redacted. Native output is bounded to 2 MiB, with a fifteen-minute execution limit. Cancellation terminates the owned process group and records the incomplete outcome; already-written source changes remain available for inspection alongside the recovery copy.

## CLI discovery and automatic private installation

The service first checks canonical executable locations on PATH, excluding executables inside the selected repository. A compatible executable must return its actual version and advertise the required execution controls. Incompatible installations remain untouched.

If no compatible executable is available, the service installs pinned official npm native platform packages into its own private directory. It does not run npm, lifecycle scripts, global installation, administrator commands or shell-based download scripts.

The manifest pins Codex **0.163.0** and OpenCode **1.19.1**, including exact registry URLs and SHA-512 distribution integrity for Linux, macOS and Windows on x64 and arm64. OpenCode x64 uses its baseline package. Support for an artifact does not imply that installation or model execution was verified on every host.

Downloads use only the approved HTTPS npm registry artifact URL, refuse redirects, stop at 256 MiB and have a five-minute deadline. Archive extraction checks integrity, header checksums, bounded expansion, canonical relative paths and duplicates. Symbolic links, hard links, devices and archive extension records are rejected. Only an explicit package file allowlist is installed; unrelated optional voice resources are excluded. Core licenses and the bundled Codex support-tool licenses are retained.

Each installation uses a new private staging directory, native version/help readback, hashes for installed executable and support files, and an atomic move into an immutable version/contract directory. Existing incompatible, changed or incomplete directories are preserved and reported. A changed pin or license contract receives a separate installation directory. There is no PATH modification and no automatic deletion of an older installation.

## Native integration

`BuildRepairService` takes `storageDirectory`, an optional native `fetch` adapter and an optional trusted `gitBinary`. Pass `service.repairBuild.bind(service)` as the Build Tools `repairBuild` callback. Its request accepts the failed `BuildJob`, already-approved canonical repository root, provider, explicit Boolean approval mode, abort signal and output callback. Renderer input must never supply installation manifests, fetch adapters or arbitrary repository roots.

`ensureCli(provider, signal)` performs discovery/acquisition without making a model request. Its receipt includes source, actual version, canonical executable and SHA-256. Native-only manifest/fetch dependency injection supports fixture testing and is not an IPC action.

## Sources and verification

- [Codex CLI reference](https://developers.openai.com/codex/cli/reference/).
- [Codex 0.163.0 configuration loader](https://github.com/openai/codex/blob/rust-v0.163.0/codex-rs/config/src/loader/mod.rs), including project trust and ignored user configuration.
- [OpenCode CLI reference](https://opencode.ai/docs/cli/) and [permissions](https://opencode.ai/docs/permissions/).
- [OpenCode 1.19.1 run implementation](https://github.com/anomalyco/opencode/blob/v1.19.1/packages/opencode/src/cli/cmd/run.ts), including `--auto`, standard input and JSON event output.
- [Pinned package and license manifest](../../data/build-repair-clis.json).

Linux x64 native acquisition was exercised with a deliberately empty discovery PATH, real approved registry downloads, distribution-integrity validation, private extraction, executable version/help readback and stored SHA-256 receipts. Both pinned CLIs installed successfully. No real model invocation or credentialed provider request was performed during that verification. Windows/macOS installations, authenticated model execution and the final integrated application interaction remain separate acceptance work.

Focused tests use clearly identified local executable fixtures to verify archive refusal, cache reuse, tamper preservation, safe analysis options, explicit repair options, original staged/working/untracked recovery bytes, redaction, PATH exclusion and process cancellation. Fixture command behavior is not evidence of actual model repair quality.
