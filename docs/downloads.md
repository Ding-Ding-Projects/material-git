# Download progress and recovery

Material Git includes a native streaming queue for selected GitHub release assets and workflow artifact ZIP archives. The Downloads workspace uses registered Material Web controls, a separate Start download dialog, an independent Download progress dialog, custom accessible scrolling, and a non-blocking completion notice. English, Cantonese, and bilingual copy follows the application settings. Provider filenames and byte counts remain factual.

Confirming Start opens the native save picker. Cancelling either dialog or the picker leaves the queue unchanged. The queue continues while another workspace is open. Each job shows the exact provider record, destination filename, state, transferred bytes, rate, and ETA when available. Pause, cancel, resume, retry, and removal operate the native transfer. Removal deletes an owned partial file and its queue entry; it preserves a completed destination.

Resume requires a strong ETag, advertised byte-range support, the same approved host/repository/provider ID/account, and a matching source size/checksum. A resumed response must return status 206 with the exact Content-Range, total size, and ETag. A changed source, stale ETag, or status 200 fails with a recovery explanation. Retry deliberately starts fresh and re-resolves the selected provider record. Authentication failures offer Sign in beside the failed transfer. Existing destinations are preserved and offer a new native destination flow.

The queue verifies exact length before publication and checks SHA-256 when the provider supplies a digest. Length-only verification is labelled honestly. Success follows file synchronization, digest checking, and atomic hard-link publication that cannot overwrite an existing destination. Filesystems lacking hard-link support fail safely with a storage issue. Linux synchronizes the containing directory; Windows filesystem durability still requires native platform verification.

## Native integration

Instantiate `DownloadQueue` from `src/main/downloads.ts` with these trusted dependencies:

| Dependency | Required behavior |
| --- | --- |
| `resolveSource(selection)` | Approve the selected hostname, re-read the exact asset/artifact by ID from the real provider, reject expired artifacts, and return its canonical API origin, exact endpoint, name, optional exact archive size, and optional SHA-256. Never accept a renderer URL. |
| `accountFingerprint(hostname)` | Return a stable opaque identifier for the exact active account. Reject an unavailable account. |
| `token(hostname, expectedAccount)` | Retrieve only the expected account's credential internally. Keep the token in memory; never route it through renderer IPC, normal subprocess operation logs, history, or exports. A changing active account cannot change which credential this method returns. |
| `pickDestination(suggestedName)` | Use the native save picker and return its absolute selected file path or null. The renderer supplies neither a path nor a directory grant. |
| `store.read/write` | Persist `StoredDownload[]` through the existing native protected/encrypted sensitive-record service. Paths and account fingerprints must never enter ordinary settings/history/export records. Bound records to 200 and retain schema version 1. Set `durable:true` only when protected persistence is available; otherwise use an in-memory store. |
| `fetch` | Optionally inject an abortable native transport with manual redirects. Preserve application network policy and TLS verification. |
| `approveRedirect` | Optionally approve enterprise/provider-specific HTTPS storage origins. Never approve arbitrary renderer hosts. Public GitHub defaults allow only specific known download origins. |

Release endpoints are `/repos/OWNER/REPOSITORY/releases/assets/ASSET_ID`; artifact endpoints are `/repos/OWNER/REPOSITORY/actions/artifacts/ARTIFACT_ID/zip`. For Enterprise API origins containing `/api/v3`, adapt the native transport to prefix that API base while leaving the queue's exact relative endpoint intact. A resolver cannot replace either endpoint. If provider artifact metadata is an unpacked size rather than an exact ZIP byte length, omit `size`; the download response must then provide Content-Length. Unknown-length responses fail safely instead of claiming verified completion.

Queue `handle(request)` accepts only `list`, `enqueue`, `pause`, `cancel`, `resume`, `retry`, and `remove`. `enqueue` accepts `{kind, hostname, repository, id}` only. `list` returns 20 jobs per page and reports recovery as `durable` or `session`. The interface explains session-only recovery when encryption is unavailable. `subscribe(listener)` emits sanitized `DownloadJob` updates. `activeJobs()` and `activeOperations` cover queued/downloading/finalizing transfers; await `pauseAll()` or `cancelAll()` when guarding account changes. Validate the Electron IPC sender using the same trusted-window boundary as other native requests, expose these typed methods in preload, and unsubscribe when a renderer closes. Await `close()` before application teardown to pause active transfers and save recovery metadata.

Connect `<mg-downloads>` from `src/renderer/downloads.ts` with `.client = {handle, subscribe}` and `.settings = appSettings`. To open Start download from a real asset row, set `.selection` to the exact selected provider record and `.sourceName` to its displayed name. Do this for individual release asset and artifact rows; do not repurpose the old CLI directory-download form. The component dispatches `github-navigate` with `{domain:'accounts'}` for reauthentication, `download-start-dismissed` when Start is cancelled, and `download-complete` with `{job}` only after native completion. The client is injected so integration does not require renderer access to native credentials.

The application shell now includes the Downloads navigation destination, subscribes for completion notices across workspaces, and connects this client through typed preload methods `downloads(request)` and `onDownload(callback)`. Their native channels are `material:downloads` and `material:download-update`. Release asset and workflow artifact rows emit `github-download-selection` with the real `{selection, name}`; the shell opens the matching Start dialog. Expired artifact rows disable download. The primary workspace currently identifies its GitHub origin as `github.com`; native resolution still approves that host and exact record before any transfer. Native queue construction and shutdown guards belong to the main-process integration.

## Privacy and recovery

All public job snapshots contain only destination filenames, factual provider identifiers, aggregate byte data, state, and bounded issue codes. They contain no absolute paths, signed URLs, request headers, cookies, or tokens. Native errors exposed to the renderer use fixed messages; upstream failures are not echoed. Authorization starts on the approved API origin and is stripped on every origin-changing redirect. It is never restored on a later redirect. Signed URLs remain transient and are absent from recovery records.

Each partial has a queue-generated UUID filename. Protected recovery metadata binds its filesystem identity, account, provider source, strong ETag, durable checkpoint length and digest. Recovery validates the prefix and truncates only uncommitted trailing bytes on that same owned file. Changed files, symlinks, invalid records, and mismatched checkpoints cannot resume. A finalization receipt is saved before publication, so recovery can recognize a verified destination after a crash between publication and completion persistence. Removal checks ownership before deleting a partial.

The queue bounds redirects to five, transfer inactivity to 30 seconds, records to 200, and list pages to 20. Streams are consumed incrementally and cancelled on all failure paths. Queue state never stores provider response bodies or credentials.

## Verification and remaining evidence

`node --import tsx --test tests/downloads*.test.ts` exercises actual loopback HTTP streams, progress, pause/resume, stale ETags, truncated and corrupt data, cancellation, collisions, restored state, checkpoint integrity, symlink replacement, account isolation, provider renames, deferred startup storage failures, credential stripping, and redaction. The compiled-component browser test connects real registered Material controls to that native queue and drives Start cancellation, progress, pause/resume failure recovery, retry, completion, language modes, narrow layout, and custom scrolling. A separate compiled provider-row browser test checks exact release asset/artifact IDs and expired artifact controls using fixture provider records. These are local fixture tests, not a claim of live private GitHub permission.

The renderer's accessible independent progress dialog is the bounded in-window equivalent. Native secondary-window placement and always-on-top start/completion presentation require integration with the owning Electron window service and platform tests. No browser-extension handoff, topmost Windows surface, Windows credential-vault behavior, installer behavior, or public built-app capture is established by the component tests. Those remain explicit integration/evidence work rather than inferred success.

A separate public read-only verification on 2026-10-08 used the native queue against GitHub CLI release `v2.102.0`, asset `599854636` (`gh_2.102.0_checksums.txt`). The real transfer completed with 1,971 bytes and provider SHA-256 `afe49e9affa232faa8212aed035417166f6ade9b9470acb53d4dbd28c0504e8d`. This confirms that public API asset resolution, streaming, and redirects worked for that exact small asset; it does not establish private-asset authorization or installed application integration.

## 粵語使用說明

喺真實版本資產或者工作流程成品嗰行揀下載，會先開啟「開始下載」。確認後揀原生儲存目的地，再加入下載列；取消唔會加入任何下載。下載進度視窗顯示真實位元組數、速度同預計剩餘時間。暫停、取消、繼續下載同重新下載都會操作原生傳輸。既有檔案唔會畀取代；移除記錄只會刪除屬於該下載嘅未完成檔案。

繼續下載需要來源、帳戶、大小、強 ETag 同位元組範圍全部吻合。來源改變或者未能繼續時，可以重新下載。驗證失敗唔會顯示完成；只有檔案同步、大小核對、可用嘅 SHA-256 核對同安全發佈完成後，先會顯示完成通知。重新開啟應用程式時，會核對復原記錄同未完成檔案，再提供可用嘅復原操作。登入問題會喺該下載旁邊提供登入操作。
