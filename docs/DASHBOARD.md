# Download Dashboard — Module 19

## Data source

`DASHBOARD_QUERY` returns the local `DashboardSnapshot`:

- all retained history entries,
- counts for queued/downloading/completed/failed/cancelled/interrupted,
- completed file count,
- sum of completed `totalBytes` (or `bytesReceived` when total is absent),
- count of completed entries that actually had a byte total.

The dashboard refreshes on mount and whenever `DOWNLOADS_UPDATED` is emitted.

## UI

- Stats: active, remaining (queued + active), completed files, failed/interrupted, cancelled, and known size.
- **Known size** displays “Unknown” when no completed entry has a byte total; it never invents a size.
- Filters: All, Queue, Completed, Failed, Cancelled.
- One tile per history entry with thumbnail (when available), account, platform, filename, relative time, status, failure reason, and actions.
- Queue/active tiles show Chrome-reported progress only when `totalBytes > 0`; otherwise the UI uses an indeterminate bar.
- **Retry** for failed/interrupted/cancelled entries.
- **Cancel** for queued/downloading entries.
- **Open file** for completed entries calls `chrome.downloads.open` after a user click; if that fails, it falls back to `chrome.downloads.show` (folder) and reports the fallback.
- **Clear completed** removes completed history entries after confirmation; files remain on disk.
- Demo mode shows sample history and disables real file/download actions with clear preview messaging.

## Limitations

- Totals cover retained local history only. History retention/pruning/clearing changes totals.
- File sizes and progress are unavailable when Chrome does not provide totals.
- Opening depends on Chrome/OS file associations and the file still existing.
- Clearing completed entries does not delete files.

## Tests

`tests/components/dashboard-page.test.tsx` covers stats, byte progress, failure text, filter/actions, open-file call, retry/cancel messaging, and clear-completed confirmation. `tests/storage/history.test.ts` covers snapshot aggregation and completed/old-entry clearing.
