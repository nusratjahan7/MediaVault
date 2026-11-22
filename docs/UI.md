# MediaVault UI — Module 2

## Design direction

- Neutral zinc surfaces with a purple/iris accent (`#5B5BD6` light, `#7C7CF2` dark).
- Tokenized light and dark themes; system preference supported.
- Rounded cards, subtle 1px borders, restrained shadows.
- System font stack with tight heading tracking and tabular numerals for counts.
- 150–220 ms transitions on hover, progress, and entry animations; all respect `prefers-reduced-motion`.
- Responsive from a 380px popup to a full-page 5xl layout.

## Surfaces

| Surface | Build entry | Purpose |
| --- | --- | --- |
| Popup | `popup.html` | Platform detection, page/account context, current/bulk/select actions, queue preview, settings shortcut |
| Side panel | `sidepanel.html` | Library and Queue tabs, local history actions, links to full pages |
| Settings | `options.html` | Appearance, downloads, site access, interface preview, privacy/data, about |
| Download history | `history.html` | Stats, filters, search, pagination, retry/reveal/delete/clear |
| Account selection | `accounts.html` | Mock account cards per platform, preview context selection |
| Toasts | all surfaces | Success, error, and informational feedback |

## Popup anatomy

1. **Header** — brand, theme toggle, library, settings.
2. **Demo toolbar** (when preview mode is active) — exit preview and switch platform.
3. **Page context card** — platform, page type, account avatar/name/handle, media count, page title, source badge (`Live page` / `Demo data`), and account switch.
4. **Queue preview** — active/completed sample jobs with thumbnails, statuses, and progress; link to full history.
5. **Scan results** — limitations, `Download current`, `Bulk download`, `Start select`, media filters, and grid.
6. **Bulk selection toolbar** — select all/clear, selected count, and download-selected.
7. **Footer** — local-only/privacy reassurance.

Unsupported pages, disabled sites, scanning, empty results, and errors all have dedicated states. The permission gate includes a direct path into the demo preview.

## Reusable components

| Area | Components |
| --- | --- |
| Primitives | Button, IconButton, Card, Badge, Toggle, Checkbox, Input, Select, SegmentedControl, ProgressBar, Skeleton, Spinner, EmptyState, ErrorState, Modal, Toast, StatCard, DemoBanner |
| Layout | BrandMark, Header, Container, Section, PageNav, PageShell |
| Media | PlatformBadge, MediaCard, MediaGrid, MediaFilters, MediaActionBar, LimitationNotice, SelectionBar, DownloadBar |
| Queue | QueuePreview with per-item status, progress, retry/empty/error states |
| Context | PageContextCard |
| Accounts | AccountCard |
| History | HistoryFilters, HistoryRow, HistoryList |
| Settings | ThemeSelector, FilenameTemplateField, SiteAccessList, DataManagement |

## Demo mode and mock boundary

Enable **Settings → Interface preview → Demo data mode**, or use the preview button on unsupported/disabled pages. The setting is stored locally and defaults to off.

**Mock layer:** `src/mocks/`

- `accounts.ts` — sample profiles per platform
- `media.ts` — sample `MediaItem[]` and `ScanResult`s with local SVG data-URI thumbnails
- `pages.ts` — sample page/account context
- `history.ts` — representative completed/queued/downloading/failed/interrupted/cancelled entries
- `queue.ts` — simulated queue with deterministic progress ticks
- `preview-preferences.ts` — selected preview account per platform (`mediavault:preview:accounts:v1`)
- `index.ts` — the only public entry point for mock content

**Production layer:** existing `src/services`, `src/storage`, `src/background`, `src/downloads`.

Rules enforced by design:

- Demo mode never calls `chrome.downloads`, never enqueues real jobs, and never reads a live account.
- Mock media uses `https://preview.mediavault.local/...` URLs and local data-URI thumbnails, so previews make no network requests.
- Turning demo mode off restores live surfaces without changing stored settings or history.
- Mock selection state is stored under a separate `mediavault:preview:*` key.

## States

- **Loading:** skeletons in popup scan, queue, side panel, and full history.
- **Empty:** unsupported page, no media, empty queue, no history, filtered-out history.
- **Error:** scan failure, queue unavailable, history fetch failure, permission rejection.
- **Success:** toasts for preview actions, settings saves, account selection, and live download queueing.

## Instagram in-page actions

- A **Download** button is injected into supported post action rows inside an isolated shadow root.
- Accessible profile-grid items get a compact overlay download button; story/highlight pages get one overlay button on the active media.
- Login/private pages and demo mode receive no in-page buttons.
- Grid buttons save the rendered grid image and show a toast telling the user to open the post for original media.
- Feedback is shown in a shadow-DOM toast stack; no page CSS leaks into the controls.

The popup also offers **Copy caption & source URL** for Instagram and Facebook, and distinguishes “already downloaded” from unavailable media when Skip Downloaded is on. Facebook page types include albums and reels alongside photos, videos, profiles, and feeds.

## Live download feedback

- Queue rows show Chrome-reported percentage progress and byte counts; no percentage is invented. If Chrome has no total size, the row uses an indeterminate bar.
- Status labels include Pending/Queued, Downloading, Paused, Saved, Failed, Cancelled.
- Active rows expose **Cancel**; failed/cancelled rows expose **Retry** through the download service.
- Full history rows show bytes received / total bytes when Chrome reports them.
- **Ask where to save each file** in Settings hands folder selection to Chrome's native Save As dialog.

## Accessibility and responsiveness

- Native buttons/inputs, ARIA labels on icon-only controls, `aria-pressed`, `role="switch"`, `role="radiogroup"`, and `role="toolbar"`.
- Visible focus rings and keyboard-operable filters, toggles, and actions.
- Responsive grids (`2 → 3` columns), stackable page headers, mobile page links, and a side panel that works at 300px.
- Reduced-motion overrides for every animation.
