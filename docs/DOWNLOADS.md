# Download Engine — Module 4

## Service

`src/downloads/service.ts` exports `DownloadService` and the app singleton `downloadService`.

```ts
enqueue(source, { autoStart? }): Promise<DownloadRecord>
start(id?): void
pause(id): Promise<boolean>
resume(id): Promise<boolean>
cancel(id): Promise<boolean>
retry(id): Promise<boolean>
getStatus(id): Promise<DownloadRecord | null>
getHistory(limit?): Promise<DownloadRecord[]>
init(): Promise<void>
```

The engine is platform-agnostic. `DownloadSource` contains only an id, direct URL, media kind, and optional display metadata. It never imports a platform adapter.

## Typed states

```ts
type DownloadState = 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
```

`pending` → `downloading` → `completed | failed | cancelled`.

Pause is represented by `paused: true` on a `downloading` record rather than a sixth state, matching Chrome's model. Pause is best-effort: it returns `false` when Chrome cannot pause that download.

## Completion and progress rules

- A job is marked **completed only after Chrome reports `state === "complete"`** via `downloads.onChanged`, a fresh `downloads.search`, or startup reconciliation.
- Starting a download never reports completion.
- Progress comes exclusively from Chrome's `bytesReceived` / `totalBytes`, polled every 700 ms while a job is active.
- Live progress is capped at 99% until Chrome confirms completion. If Chrome reports no total size, the UI shows an indeterminate bar rather than a fabricated percentage.
- Final byte counts are written from Chrome's `DownloadItem` when completion/interruption arrives.

## Concurrency

Settings → Downloads → Parallel downloads accepts 1–3 (default 2). `DownloadService.setConcurrency` clamps the value and starts pending jobs only as active slots free. The background updates the service when settings change. There is no unbounded concurrency path.

## Bulk queue

Bulk selection enqueues multiple jobs through the same service. Queue UI exposes per-item status, Chrome byte progress, pause/resume (when supported), cancel, and retry. Failure count badges and per-item errors provide an error summary. Each item still generates its own path under `MediaVault/<platform>/`, preserving the original platform category.

## Cancellation

- Pending jobs are cancelled immediately (nothing was sent to Chrome).
- In-flight jobs call `chrome.downloads.cancel`, then read the resulting Chrome state.
- `USER_CANCELED` / a cancel request maps to `cancelled`; a download that Chrome already completed is reported as `completed`, not cancelled.

## Retry and expired URLs

`retry(id)` accepts failed or cancelled jobs, reuses the same history id/source, regenerates a safe filename, and starts a fresh Chrome download. The UI calls this through `RETRY_DOWNLOAD`.

Chrome network errors are translated into actionable messages:

- `NETWORK_FAILED`, `NETWORK_TIMEOUT`, `NETWORK_DISCONNECTED` → “The media URL could not be reached. It may have expired — reload the page and scan again.”
- `SERVER_FORBIDDEN`, `SERVER_UNAUTHORIZED` → link may have expired or need a fresh page visit.
- Filesystem errors (`FILE_NO_SPACE`, `FILE_ACCESS_DENIED`, `FILE_NAME_TOO_LONG`) are reported distinctly.

Expired signed URLs are never rewritten, guessed, or fetched through a proxy.

## Destination and filenames

- `chrome.downloads.download` receives a sanitized relative path (`MediaVault/<platform>/<safe-name>.<ext>`).
- Duplicate names use `conflictAction: 'uniquify'`.
- Settings → Downloads → **Ask where to save each file** sets `saveAs: true`, invoking Chrome's native folder picker. When off, Chrome uses the default download folder plus the configured subfolder.
- Original direct media URLs are used as-is; no transcoding or re-hosting occurs.

## Skip Downloaded

When Settings → Downloads → **Skip Downloaded** is enabled, `enqueue` checks local history for a completed entry with the same media id or URL. Duplicates throw `ALREADY_DOWNLOADED`; the queue facade counts them separately so the popup and in-page toast can say “already downloaded” instead of “no direct link”.

The check uses completed local history only. Disabling the setting, deleting the completed entry, or disabling history allows another copy.

## History and reconciliation

- Every job writes the existing `HistoryEntry` shape with status, bytes, total bytes, paused flag, download id, and error.
- On service-worker startup, active rows are reconciled against `chrome.downloads.search`; in-progress downloads are reattached to polling, completed rows are finalized, and missing/interrupted downloads become failed with a clear message.
- `getHistory()` merges in-memory session records with persisted IndexedDB history.

## Privacy

The engine talks only to Chrome's Downloads API. It never uploads media, never proxies downloads, and never reads cookies or session tokens. The URL being downloaded is the direct URL already exposed to the page.

## Tests

`tests/downloads/service.test.ts` verifies:

- pending jobs do not start or complete on enqueue;
- completion waits for Chrome confirmation;
- progress derives only from Chrome bytes;
- pause/resume calls the Chrome API;
- pending and in-flight cancellation;
- retry creates a fresh browser download;
- Save As maps to Chrome's `saveAs` flag;
- duplicate filenames keep `uniquify`;
- typed history comes from the service;
- invalid/restricted sources are rejected.
