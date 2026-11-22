# Bulk Selection & Queue — Module 8

## Selection UX

- **Start select** enters selection mode; supported media cards show a checkbox overlay.
- Clicking a card toggles that individual item.
- **Select all** adds every currently discovered, downloadable item on the page.
- Carousel/slideshow/album items are selected independently.
- The sticky bulk toolbar shows the selected count and **Download N**.
- Selected cards can be toggled off individually; **Clear selection** empties the selection.
- Filters (All/Photos/Videos) do not clear selection.
- Restored selections keep the bulk toolbar visible even before re-entering select mode.

## Selection persistence

Selection is stored in `chrome.storage.session` keyed by browser tab:

- `mediavault:selection:v1:<tabId>`
- stores up to 200 `MediaItem`s with a versioned envelope
- cleared when the browser session ends (or the extension clears it)
- not synced or uploaded

Switching between supported tabs and reopening the popup restores each tab's selection. Items from other platforms can remain selected; each download still gets its original platform folder (`MediaVault/<platform>/...`).

Selection is best-effort: signed media URLs can expire between selection and download; failures are surfaced per item and can be retried/rescanned.

## Queue and concurrency

- Downloads run through the shared `DownloadService`.
- Parallel downloads are configurable in Settings → Downloads: **1, 2, or 3** (default 2).
- The engine clamps to `1..3`; it never creates unlimited concurrent requests.
- Pending jobs start as active slots free; lowering concurrency does not cancel active downloads.
- Duplicate detection:
  - selection is deduplicated by media id;
  - Skip Downloaded blocks completed duplicates;
  - Chrome receives `conflictAction: 'uniquify'` for filenames.

## Queue controls and status

The queue preview and library expose:

- per-item state (queued, downloading, paused, saved, failed, interrupted, cancelled);
- Chrome-reported percentage/bytes when available, indeterminate otherwise;
- **Pause** / **Resume** when Chrome supports it for that download;
- **Cancel** for queued/in-flight jobs;
- **Retry** for failed/interrupted/cancelled jobs;
- a failure-count badge and per-item error text;
- overall progress in the popup download bar (`saved / failed / total`).

Demo queue items never expose real actions; they remain simulated.

## Error handling

- Pause/resume/cancel/retry failures produce toasts with actionable messages.
- Expired/network failures keep the standard rescan guidance.
- Retry reuses the existing history id/source and starts a fresh Chrome download.
- No mocked progress or premature completion is used.

## Tests

- selection storage per tab, clearing, malformed data;
- popup bulk selection of two TikTok videos and session persistence;
- configured concurrency limit in `DownloadService`;
- queue pause/cancel actions and failure summary;
- pause/resume message routing;
- settings clamping for concurrency.
