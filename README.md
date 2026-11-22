# MediaVault

A premium, privacy-first Chrome extension for saving media you are authorized to access from Instagram, Facebook, and TikTok. Everything runs locally in your browser — no backend, no accounts, no analytics.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-5B5BD6) ![React](https://img.shields.io/badge/React-19-5B5BD6) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-5B5BD6) ![Vite](https://img.shields.io/badge/Vite-6-5B5BD6)

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — module boundaries, messaging, errors, storage, permissions, build pipeline
- [Platform adapters](./docs/ADAPTERS.md) — detection, account identity, metadata, formats, resilience
- [Download engine](./docs/DOWNLOADS.md) — service API, states, progress, cancellation, retry, folder choice
- [Download dashboard](./docs/DASHBOARD.md) — stats, queue tiles, retry/cancel/open, known sizes
- [Complete settings](./docs/SETTINGS.md) — every persisted preference, defaults, validation, resets
- [Security audit](./docs/SECURITY_AUDIT.md) — permissions, storage, network, risks, fixes
- [Installation](./docs/INSTALL.md) — build, load unpacked, ZIP, troubleshooting
- [Release report](./docs/RELEASE_REPORT.md) — tested/untested status, limitations, release steps
- [Changelog](./CHANGELOG.md)
- [Folder organization & filenames](./docs/ORGANIZATION.md) — folders, templates, variables, sanitization, duplicates
- [Format & quality](./docs/FORMATS.md) — image conversion, video source selection, sidecars, output reporting
- [Instagram adapter](./docs/ADAPTERS.md#instagram-specifics) — page/media support, in-page buttons, profile grids, stories, Skip Downloaded
- [Facebook module](./docs/FACEBOOK.md) — albums, reels, direct-video safeguards, metadata, URL formats
- [TikTok module](./docs/TIKTOK.md) — videos, thumbnails, slideshows, profile discovery, bulk selection
- [Bulk selection & queue](./docs/BULK.md) — selection persistence, concurrency, queue controls
- [Stories & highlights](./docs/STORIES.md) — models, discovery, expiration, covers, privacy boundaries
- [Saved lists](./docs/SAVED_LISTS.md) — local profile lists, import/export validation, sequential workflow
- [Relationship export](./docs/RELATIONSHIPS.md) — visible-page and official-export CSV/JSON flows, field selection, limits
- [Privacy & Ghost Mode](./docs/PRIVACY.md) — local-only status, permissions, clearing data, honest anonymity limits
- [UI guide](./docs/UI.md) — design system, surfaces, components, demo mode and the mock boundary
- [Privacy policy](./PRIVACY.md)
- [Module status](#module-status)

## Module status

- **Module 1 — Extension Foundation:** complete. MV3 skeleton, build pipeline, shared types, typed messaging, centralized error boundary, and package verifier.
- **Module 2 — Premium MediaVault UI:** complete. Popup, side panel, settings, full history page, account selection page, bulk selection toolbar, queue/progress interface, empty/error states, and toasts. A clearly isolated demo-data mode makes every surface reviewable without touching real downloads.
- **Module 3 — Platform Detection & Media Discovery:** complete. A shared `PlatformAdapter` contract, per-platform page type/account detection, normalized metadata (post id/date/source/formats/status), download options, graceful failure handling, and dedicated detection/metadata tests.
- **Module 4 — Single Media Download System:** complete. A platform-independent `DownloadService` with typed states, Chrome-confirmed completion, real byte progress, pause/resume, cancellation, retry, Save As folder choice, duplicate handling, history persistence, and startup reconciliation.
- **Module 5 — Instagram Media Downloader:** complete. Photo/video/carousel/reel/profile-picture/story/highlight discovery, inline post action buttons, profile-grid overlay buttons, caption/source export, and Skip Downloaded deduplication.
- **Module 6 — Facebook Media Downloader:** complete. Photos, direct videos, rendered album media, reels, profile/page discovery, Facebook-specific metadata/URL formats, caption export, and explicit unsupported-video handling.
- **Module 7 — TikTok Media Downloader:** complete. Current videos, thumbnails, slideshows, multi-video profile discovery, profile-card link handling, caption export, and bulk selection through the shared engine.
- **Module 8 — Bulk Download & Start Select:** complete. Session-persisted per-tab selection, checkbox overlays, select-all/clear/remove, configurable 1–3 concurrency, per-item queue controls, retry, failure summaries, and platform-folder preservation.
- **Module 10 — Stories & Highlights Manager:** complete. StoryMedia/HighlightMedia models, per-adapter story/highlight discovery, expiration information, per-story/account saves, highlight titles, cover downloads, and explicit privacy/anonymity limitations.
- **Module 11 — Folder Organization & Filename Rules:** complete. Optional account/category/media-type folders, per-account sorting, posts/videos/Reels/stories/highlights folders, highlight-title organization, filename variables, live preview, saved/reusable templates, reset, sanitization, traversal protection, length limits, and Chrome uniquify duplicates.
- **Module 13 — Media Format & Quality:** complete. Original/JPG/PNG/WebP image preferences with local canvas conversion, highest-exposed-source video selection, thumbnail/caption/metadata sidecars, and selected/actual format reporting. No video transcoding or audio/video remuxing is claimed.
- **Module 14 — Account Manager & Saved Lists:** complete. Local lists with create/rename/delete, profile add/remove, multi-select, sequential profile workflow, strict JSON import, and confirmed JSON export.
- **Module 15 — Account Relationship Export:** complete. Visible followers/following rows plus user-chosen official data exports, local CSV/JSON export, filtering, field selection, and kind isolation. No crawling or privacy-control bypass.
- **Module 16 — Privacy & Ghost Mode:** complete. Local-only status, data clearing including saved lists/workflow, permission overview, and an honest Ghost Mode section with official platform privacy links and no anonymity claims.
- **Module 18 — Advanced Download Settings:** complete. Folder/account/media-type organization, templates, image format, thumbnails, captions, Skip Downloaded, new-media memory, concurrency, automatic retries, bulk confirmation, notifications, automatic history clearing, theme, privacy, and Reset settings.
- **Module 19 — Download Dashboard:** complete. Active/completed/failed/cancelled counts, known sizes, queue progress, per-file tiles and errors, retry/cancel/open, and clear completed.
- **Module 20 — Security & Privacy Audit:** complete. Permission allowlist, explicit CSP, runtime message validation, import validation, filename/path sanitization, no unsafe HTML/eval/remote code, permission explanations, and audit report.
- **Module 21 — Production Release:** 1.0.0 build, ZIP, changelog, install guide, store description draft, privacy policy draft, release report, and real-Chrome smoke test (all pages + one real localhost download).

All downloads use Chrome's Downloads API directly. No media is uploaded, proxied, or routed through a MediaVault server.

## What it does

- Scans the **current page** for media that is already visible and downloadable.
- Detects the platform, page type, and visible account for Instagram, Facebook, and TikTok.
- Extracts direct media URLs and permitted metadata from rendered DOM and public embedded page data.
- Reports supported formats and availability without assuming every platform exposes the same fields.
- Downloads one media file per job through Chrome's Downloads API with safe filenames, duplicate handling, real progress, pause/resume, cancellation, and retry.
- Lets Chrome prompt for a destination folder (Save As) or uses the configured local subfolder.
- Tracks local download history in IndexedDB with a side-panel library and a full history page.
- Shows page/account context, current/bulk download actions, a select mode, and a live queue preview.
- Keeps multi-item selections per browser tab, including across filters and popup reopen.
- Runs 1–3 configurable parallel downloads with pause/resume/cancel/retry and failure summaries.
- Discovers visible stories and highlights, shows expiration when known, saves individual stories or all from an account, and saves highlight media/covers.
- Organizes highlight downloads by their title under each platform folder.
- Sorts downloads with optional account, category, and media-type folders.
- Builds safe filenames from username, date, media ID, index, caption, location, platform, media type, and extension.
- Saves reusable filename templates with a live path preview and reset-to-default.
- Preserves original images or converts supported images locally to JPG/PNG/WebP.
- Selects the highest legitimately exposed video source; never invents 4K/60fps/lossless quality.
- Optionally saves thumbnails, caption text, and source/publication metadata sidecars.
- Saves local profile lists, selects multiple profiles, and opens a sequential manual download workflow.
- Exports/imports lists as JSON with strict validation and confirmation dialogs.
- Exports visible or official-export follower/following data as local CSV or JSON with filtering and field selection.
- Shows local-only status, permission explanations, saved-list/history clearing, and a Ghost Mode section without anonymity claims.
- Monitors active/finished/failed/cancelled downloads in a responsive dashboard with byte-based progress and known sizes.
- Opens completed files with Chrome's supported download action and supports dashboard retry/cancel/clear.
- Remembers completed media IDs for “Download new media only,” even after history is cleared.
- Optionally auto-retries failures, confirms bulk actions, and shows opt-in Chrome notifications.
- Adds Instagram download buttons beside post actions and on accessible profile-grid items.
- Saves profile pictures, carousel slides, reels, and directly accessible story/highlight media where permitted.
- Discovers Facebook photos, direct videos, albums, reels, and visible profile/page media.
- Refuses page-only or adaptive Facebook video instead of pretending a file exists.
- Discovers TikTok videos, thumbnails, slideshows, and multiple embedded profile videos.
- Shows TikTok profile cards as links when direct media is unavailable, with downloadable thumbnails.
- Copies caption + account + source URL from the popup for Instagram, Facebook, and TikTok.
- Skips already-downloaded media when Skip Downloaded is enabled.
- Offers a per-platform account-selection preview and a fully mock-driven interface preview.
- Gives you one-click per-site access, revocable at any time.

## What it deliberately does not do

- No private-account, login-wall, DRM, or access-control bypass.
- No cookie, token, password, or private-message access.
- No backend, cloud sync, telemetry, or remote code.
- No bulk profile/feed crawling or bypass of platform rate limits.
- No reconstruction of MSE/DASH streams.

## Requirements

- Node.js 20 or newer (Node 22+ recommended)
- Chrome 116 or newer (Manifest V3, `sidePanel.open`)
- npm

## Install and build

```bash
npm install
npm run build
```

> If your environment sets `NODE_ENV=production`, npm may skip dev dependencies. Run `npm install --include=dev` in that case. The `test` scripts already force `NODE_ENV=test` so React's development build is used by Vitest.

Load the extension:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the generated `dist/` folder.
4. Pin MediaVault to the toolbar.

### Development

```bash
npm run dev
```

This watches both Vite builds into `dist/`. Reload the extension from `chrome://extensions` after changes.

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Watch the page bundle and content script |
| `npm run build` | Typecheck, build UI/background, build content script, verify package |
| `npm run verify:dist` | Validate manifest fields, permissions, HTML references, and chunk imports |
| `npm run check` | Lint, test, and build in one command |
| `npm run typecheck` | Strict TypeScript checks for app and build config |
| `npm run lint` | ESLint 9 flat config |
| `npm run test` | Vitest in watch mode |
| `npm run test:run` | Vitest once |
| `npm run format` | Prettier with Tailwind class sorting |
| `npm run icons` | Regenerate PNG icons from the built-in SVG |

## Using MediaVault

1. Open a post, photo, reel, or video on a supported site.
2. Click the MediaVault toolbar icon.
3. Click **Enable on this site** once. Chrome asks you to confirm site access.
4. Scan runs automatically. Use **Download current**, **Bulk download**, or **Start select** for granular selection.
5. Open **Library** in the side panel to watch real Chrome progress, cancel, retry, reveal, or remove entries; open the full **History** and **Accounts** pages from the header or footer.

On Instagram, a **Download** button appears beside the post action row, and compact download buttons appear on accessible profile-grid items. Profile-grid buttons save the rendered grid image; open a post for its original media. Story/highlight buttons appear only when the page exposes a direct media file.

On Facebook, the popup lists visible photos, direct video sources, rendered album items, reels, and visible profile/page media. Albums expose each rendered photo with its own post id and URL. Facebook videos are only offered when the page exposes a direct file — adaptive/DASH and page-only video links are reported unavailable.

On TikTok, the open video and its cover thumbnail are listed. Public embedded profile data can expose multiple videos; otherwise visible profile cards appear as links with downloadable thumbnails and a clear “open the video” reason. Bulk selection works for every accessible video/image/thumbnail item.

To choose the destination folder yourself, enable **Settings → Downloads → Ask where to save each file**. Chrome then shows its native Save As dialog for every download. Otherwise Chrome saves to your default download folder plus the configured subfolder. Chrome's Downloads API does not let an extension persist an arbitrary absolute folder, so the Save As picker is the supported per-download choice.

Settings → Downloads controls account, category, and media-type folders plus the filename template library and live preview. Settings → Format & quality controls image output, highest-source video selection, and thumbnail/caption/metadata sidecars. Actual queued format and quality appear in queue and history rows.

The **Accounts** page manages local saved lists. Select profiles across lists, then **Start workflow** to open each profile one at a time; downloads remain manual through the popup and no profile crawling occurs. Export/import use explicit confirmation dialogs; imports are validated before anything is saved.

The **Export** page reads follower/following rows already visible on a page or parses an official platform data export you choose. Filter, choose fields, then download CSV or JSON locally. Type-to-read is limited to the visible page or the chosen file.

The **Dashboard** page shows active, queued, completed, failed, and cancelled downloads. Completed tiles open the file through Chrome after a user click; files can also be revealed if direct opening is unavailable. Sizes/progress appear only when Chrome provides byte totals.

Settings → Downloads contains the advanced controls: new-media memory, automatic retries, bulk confirmation, notifications, concurrency, history retention, and Reset settings.

Enable **Settings → Downloads → Skip Downloaded** to block media already completed in local history. The popup and in-page toasts distinguish “already downloaded” from unavailable media.

Use **Start select** for checkbox selection, **Select all**, individual toggles, **Clear selection**, and **Download N**. Selection persists per browser tab in `chrome.storage.session`. Settings → Downloads → **Parallel downloads** caps concurrency at 1–3. Queue rows expose pause/resume/cancel/retry where supported and show per-item status plus a failure-count summary.

On a story, highlight, or profile page, use **Stories & highlights** in the popup (or the Stories navigation item). The manager shows accessible stories with expiration hints, per-account **Save all**, highlight media, and cover downloads. Highlights are saved under `MediaVault/<platform>/highlights/<Title>/`. Anonymous story viewing is not supported; MediaVault does not conceal viewing activity or bypass private-account controls.

Site access is stored per platform. Revoke it in Settings → Site access.

### Interface preview (mock data)

Open **Settings → Interface preview** and enable **Demo data mode**, or click **Preview the interface** on an unsupported/disabled page. Every screen then uses sample Instagram, Facebook, and TikTok data:

- downloads are simulated and never call Chrome Downloads;
- account selection is mock-only and never touches a session;
- thumbnails are local SVG data URIs, so the preview makes no network requests;
- turning demo mode off restores live scanning, history, and queue behavior.

Mock content lives exclusively in [`src/mocks/`](./src/mocks) and is documented in [docs/UI.md](./docs/UI.md).

## Architecture

```
src/
  background/        MV3 service worker: message router, scan and site handlers
  content/           Silent SPA-aware scanner, guarded in-page download overlay (IIFE)
  popup/             Platform/page context, actions, selection, queue preview
  options/           Appearance, downloads, site access, UI preview, privacy/data
  sidepanel/         Library and Queue tabs
  dashboard/         Download dashboard: stats, queue tiles, file actions
  history/           Full download history page
  stories/           Stories & highlights manager page
  accounts/          Saved lists manager + interface preview
  relationships/     Followers/following CSV & JSON export page
  components/        UI primitives, layout, media, queue, accounts, lists, history, settings, providers
  hooks/             Settings, theme, tab, access, scan, selection, downloads, history, queue
  services/          Typed messaging, permissions, tabs, scan, relationship import, errors, navigation
  mocks/             UI-only sample accounts/media/queue/history/preview preferences
  adapters/          PlatformAdapter contract, base pipeline, metadata normalization
    instagram/ facebook/ tiktok/   adapter + page-type + account + extraction
    instagram/                    profile stories/grid/profile-picture + in-page targets
    facebook/                     albums/reels/direct-video guards + post metadata
    tiktok/                       videos/thumbnails/multi-item profile parsing
  downloads/         DownloadService, Chrome client, folder rules, filename builder, output/sidecars, queue
  storage/           settings/sites/lists/memory + session selection/workflow + IndexedDB history
  types/             Strict shared contracts, message unions, UI contracts
  utils/             URL, filename, page context, status, formatting, errors, logging
```

**Flow:** popup → typed message → service worker → on-demand content-script injection → adapter scan → `ScanResult` → selection → download queue → `chrome.downloads` → IndexedDB history → side panel.

### Platform detection and discovery

Each adapter implements `PlatformAdapter`:

```ts
matches(url)
detectPlatform(url)
detectPageType({ document, url })
identifyAccount({ document, url })
discoverMedia({ document, url })
extractMetadata({ document, url })
getDownloadOptions(item)
```

Detected page types: profile, feed, single post, video/reel, story, highlight, tagged posts, and saved collections where the platform exposes them. Each `MediaItem` carries platform, account username/identity, media type, direct URL, thumbnail, caption, post date, post id, source page URL, formats, and download status.

Platforms expose different fields; missing values stay undefined rather than being invented. Selectors use layered fallbacks, and extraction failures return a warning instead of throwing. Login walls, private content, and adaptive streams are reported as restrictions — never bypassed. See [docs/ADAPTERS.md](./docs/ADAPTERS.md).

### Download engine

`DownloadService` is independent of platform adapters:

```ts
enqueue(source) → pending
start()         → downloading
pause()/resume() // when Chrome supports it
cancel()        → cancelled
retry()         → fresh pending attempt from the same source
getStatus() / getHistory()
```

Typed states: `pending`, `downloading`, `completed`, `failed`, `cancelled`. Completion is set **only after Chrome reports `state === "complete"`**. Progress comes only from Chrome's byte counters (capped at 99% until confirmation); there is no simulated progress. Failed network/expired-URL errors are translated into actionable messages and never retried as a success. With **Skip Downloaded** enabled, a completed media id/URL is not enqueued again. See [docs/DOWNLOADS.md](./docs/DOWNLOADS.md).

### Instagram in-page actions

Instagram-specific selectors live in `src/adapters/instagram/in-page.ts`. The generic shadow-DOM overlay (`src/content/in-page-actions.ts`) injects download buttons beside post actions, on accessible profile-grid items, and on active story/highlight media; it does not mount on login/private pages or in demo mode. See [docs/INSTAGRAM.md](./docs/INSTAGRAM.md).

The Facebook adapter handles photo/album/reel/profile URLs, per-photo `fbid`/post URLs, `data-utime` dates, embedded HD/SD sources, and a direct-video guard that rejects page-only or adaptive streams. See [docs/FACEBOOK.md](./docs/FACEBOOK.md).

The TikTok adapter parses public embedded page data into one or many items, adds downloadable cover thumbnails, exposes playback/download MP4 formats, and turns profile cards without direct sources into clearly unavailable links. No signed internal APIs are used. See [docs/TIKTOK.md](./docs/TIKTOK.md).

### Build design

The extension uses two plain Vite builds instead of a manifest plugin:

- **Page build:** `popup.html`, `options.html`, `sidepanel.html`, and the ESM service worker (`background.js`).
- **Content build:** `src/content/index.ts` bundled as a single IIFE at `content.js`.

This gives `chrome.scripting.registerContentScripts` a stable file path, which is required for optional per-site permissions.

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Save local settings and enabled sites |
| `downloads` | Save media through Chrome and track progress |
| `scripting` | Register the scanner only for sites you enable |
| `activeTab` | Identify the current tab after you click the extension |
| `sidePanel` | Show the local library |
| `optional_host_permissions` | Ask for Instagram/Facebook/TikTok access one site at a time |

No `cookies`, `tabs`, `webRequest`, or `<all_urls>`. No content script runs before you approve a site.

## Extraction approach and limitations

- **Instagram:** `og:video`/`og:image` on post and reel pages, rendered `article` images/videos, carousel slides that are rendered. Blob-only videos are marked unsupported.
- **Facebook:** `og:image`, `og:video`, direct MP4 sources, rendered photo links. Adaptive/blob video cannot be saved and is reported clearly.
- **TikTok:** public `__UNIVERSAL_DATA_FOR_REHYDRATION__` and legacy `SIGI_STATE` page data, direct `playAddr`/`downloadAddr`, slideshow images, `og:video` fallback. Signed internal APIs are never called.

Known limits (also shown in-product):

1. There are no official download APIs for these platforms; extraction uses rendered pages and embedded public state.
2. Private accounts, login walls, age gates, and region restrictions are unsupported by design.
3. MSE/DASH/blob videos have no direct file link and cannot be saved.
4. Signed CDN URLs expire — download while the page is open. Retry may still fail until the page is rescanned.
5. Progress is shown only when Chrome reports byte totals; otherwise the UI uses an indeterminate bar.
6. Pause/resume depends on Chrome supporting it for that download.
7. “Ask where to save” prompts once per file; multi-file queues may show multiple dialogs.
8. Carousels/slideshows include only rendered slides.
9. Instagram profile-grid buttons save the rendered grid image; open the post for original media.
10. Stories/highlights are saved only when the page exposes a direct file; protected content is unavailable.
11. Instagram in-page buttons depend on current DOM action rows/grid links and are not shown on login/private pages or in demo mode.
12. Facebook albums include only rendered photos; scroll to load more.
13. Facebook videos are offered only when a direct MP4/WebM source is exposed. Adaptive/DASH/blob and page-only videos are unavailable.
14. Facebook profile/page discovery is limited to media visible without login.
15. TikTok profile cards are links unless public embedded data exposes direct media; their thumbnails can still be downloaded.
16. TikTok thumbnails are saved at the resolution the page exposes; slideshow audio is not downloaded.
17. TikTok signed URLs expire quickly; rescan while the video page is open.
18. Bulk selection persists per browser tab for the current browser session; selected URLs can expire before download.
19. Concurrency is capped at three parallel downloads to respect browser and platform limits.
20. Queue pause/resume depends on Chrome supporting it for that download.
21. Stories/highlights are only discovered when already visible in the current authorized session; anonymous viewing and view concealment are not supported.
22. Story expiration is shown only when a timestamp is available; otherwise it is marked unknown.
23. Profile story rings are surfaced as open-to-load entries; profile highlight trays expose title/cover and require opening the highlight to load media. TikTok highlights are unavailable through permitted public data.
24. Highlight titles are best-effort; folders use the detected title.
25. Profile/feed crawling is intentionally absent.
26. Page type/account/date detection depends on what the platform exposes; unavailable fields remain empty.
27. Stories, highlights, tagged posts, saved collections, albums, and profile feeds are scanned only when the content is already visible/accessible.
28. Chrome 116+ desktop only.
29. Platform DOM changes can break extraction and in-page button placement until adapters are updated.
30. Chrome Web Store review may scrutinize social downloader extensions; use is limited to content you are authorized to save.
31. Chrome only allows relative Downloads paths; the Save As dialog is the supported way to choose another folder. MediaVault never writes absolute filesystem paths.
32. Image conversion requires optional media-processing access for supported CDN hosts. If access, CORS/fetch, canvas, or the source type is unavailable, the original file is kept with a visible note.
33. Image conversion re-encodes (not lossless). GIF conversion is not attempted.
34. Video is never transcoded or remuxed. Highest quality means the best source exposed by the page; separate audio/video streams are not combined, and 4K/60fps/lossless is never promised.
35. Caption/metadata sidecars use local data URLs through Chrome Downloads; sidecar downloads still need live Chrome E2E verification.
36. Location is only available when the page exposes location metadata; otherwise `{location}` is omitted.
37. Saved-list workflows open profiles one at a time; they do not crawl profiles or auto-download media. Use the popup on each opened profile.
38. Saved-list JSON import rejects malformed data but accepts only the documented username/profile URL/display name fields; extra fields are ignored.
39. Relationship export reads only currently rendered rows or a user-chosen official export. There is no automatic scrolling, private API, or bypass of hidden/private relationships; official export formats vary.
40. Ghost Mode reduces local traces only. It does not hide story views, DM read receipts, authentication, or identity, and no anonymity is claimed.
41. Reset everything clears local extension data; files already downloaded remain on disk.
42. Official relationship export links and platform privacy links are controlled by each platform and may change.
43. “Download new media only” is a local completed-media fingerprint memory; clearing all data removes it.
44. Automatic retries reuse the same source and respect the concurrency cap; expired links still require a rescan.
45. Dashboard totals reflect retained local history and only known Chrome-reported sizes; cleared/pruned history changes totals.
46. Notifications are opt-in and may expose filenames to anyone who can see the OS/Chrome notification.
47. “Open file” requires a completed download and a user click; if Chrome cannot open it, MediaVault falls back to showing the folder.
48. Live platform E2E remains a release gate; the Chrome smoke test covered extension pages and a real localhost download, not authenticated platform pages.

## Testing and verification

Verified in this repository:

```bash
npm run typecheck   # strict TypeScript, app + configs
npm run lint        # ESLint, zero warnings/errors
npm run test:run    # 234 tests passing
npm run build       # loadable dist/ + manifest/package verification
```

Coverage includes platform/page/account detection, metadata normalization, formats and download options, blob/restricted media, graceful extraction failure, the download service (pending/downloading/completed/failed/cancelled, browser-confirmed completion, byte progress, pause/resume, cancellation, retry, Save As, duplicates, Skip Downloaded, configurable concurrency, typed history), per-tab selection persistence and bulk UI, queue controls/failure summaries, story/highlight models and expiration, story/highlight manager UI, highlight title folders/covers, saved-list CRUD/import validation/workflow, saved-list UI and confirmation dialogs, visible relationship discovery, official export JSON/CSV parsing, relationship filtering/fields/CSV escaping, relationship page UI, local-only/privacy/permission UI, Ghost Mode copy, advanced settings validation/UI, new-media memory, auto-retry, notifications, automatic history clearing, dashboard stats/tiles/actions, bulk confirmation, folder organization, filename templates/variables/previews, filename sanitization/traversal/length, saved-template settings UI, highest-source video selection, local image-conversion success and fallback, thumbnail/caption/metadata sidecars, actual output reporting, Instagram profile pictures/grid/story targets, in-page overlay injection, Facebook albums/reels/embedded video/direct-video guards, TikTok thumbnails/multi-video profiles/profile cards, caption export, filename safety, URL normalization, settings/history/sites storage, typed messaging, site permissions, background router dispatch/error boundaries, popup states, demo-mode isolation, mock queue/history/account data, the history page, account cards, and the queue preview.

**Verified in real Chrome 157 headless:** via ChromeDriver/WebDriver BiDi, all eight extension pages rendered with zero runtime errors, and one real localhost media URL downloaded through the background service worker and Chrome Downloads API. The test file/history entry were removed afterward.

**Not yet verified here:** real authenticated Instagram, Facebook, and TikTok pages, live bulk cancel/retry interaction, and extension reload persistence. The manual QA checklist:

- Popup renders in light, dark, and system themes.
- Unsupported page shows the limitation; supported-but-disabled page shows the permission gate.
- Enabling a site allows scanning without a reload.
- Demo mode shows the platform switcher, page/account card, queue preview, and simulated current/bulk/select actions without calling Chrome Downloads.
- On a live post/reel/story/highlight/tagged/saved page, the context card reflects the adapter-detected page type and visible account.
- Instagram post action rows show an inline Download button; profile-grid items show compact download overlays; login/private pages show none.
- Profile picture, carousel, reel, and direct story/highlight media are discoverable and downloadable where accessible.
- Copy caption & source URL places the expected text on the clipboard for Instagram, Facebook, and TikTok.
- Facebook photo, album, reel, direct video, and profile/page media discovery works where visible.
- A Facebook page-only/adaptive video is reported unavailable rather than offered as a download.
- TikTok video + thumbnail discovery works; embedded profile lists expose multiple accessible videos for bulk selection.
- TikTok profile cards without direct media are shown as clearly unavailable links with downloadable thumbnails.
- Skip Downloaded blocks a second completed copy and reports it distinctly.
- Start Select, checkbox toggles, Select all, Clear, and selected counts work; selection survives popup reopen for the same tab.
- Parallel downloads obey the 1–3 settings cap; queue pause/resume/cancel/retry actions and failure summaries work.
- Mixed-platform selections still save under each platform's folder.
- Stories & highlights manager shows accessible stories with expiration, saves individual/all-from-account stories, and saves highlight media/covers.
- Highlight files land under `MediaVault/<platform>/highlights/<Title>/`; expired stories are disabled with a clear reason.
- Anonymous story viewing is explicitly unavailable; the UI does not claim to hide view activity.
- Folder toggles produce the previewed account/category/media-type paths; hostile account/title values cannot escape the folder.
- Saved filename templates can be selected, saved, previewed, and reset; long captions and filenames are shortened safely.
- A selected image conversion either produces the target extension or falls back to the original with a note in history.
- Highest-source video selection records HD/Source quality and the actual extension in history.
- Thumbnail, caption, and metadata sidecars appear as separate history entries and use the same folder.
- Media processing access is requested only from Format & quality when conversion is selected.
- Saved lists can be created, renamed, profile-edited, multi-selected, exported/imported with confirmation, and used to open a sequential profile workflow.
- Malformed saved-list or relationship imports are rejected before saving; no credentials are stored.
- Followers/following visible rows and official export files produce filtered CSV/JSON with only selected fields.
- Privacy status, permission explanations, saved-list clearing, and Ghost Mode links work; no anonymity is claimed.
- Dashboard renders stats/tiles, opens completed files, retries/cancels, and clears completed entries; sizes/progress match Chrome-reported bytes only.
- Advanced settings persist and apply: new-media memory, retries, bulk confirmation, notifications, auto-clear history, and Reset settings.
- Chrome smoke test installed the extension, rendered all pages, and completed one real download through the background service worker.
- Account selection persists and the popup page-context card reflects the chosen mock account.
- Full history page shows stats, filters, empty state, and clear confirmation.
- Side panel switches between Library and Queue; header/footer navigation opens history, stories, accounts, export, and settings.
- A real download shows browser byte progress; completion appears only after Chrome finishes.
- Cancel works for queued and in-flight jobs; retry restarts a failed job; Save As opens Chrome's folder picker.
- Expired links fail with a rescan message rather than a false success.
- Blob-only video shows a limitation and no unsafe attempt.
- Revoking access removes the content script and restores the gate.
- Keyboard-only navigation, 320px side panel, and reduced-motion behavior.

## Privacy and compliance

Read [PRIVACY.md](./PRIVACY.md). MediaVault does not collect, transmit, or sell any data. Only download media you have permission to save. MediaVault does not bypass access controls, strip watermarks, or defeat DRM.
