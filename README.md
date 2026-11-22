# MediaVault

A premium, privacy-first Chrome extension for saving media you are authorized to access from Instagram, Facebook, and TikTok. Everything runs locally in your browser — no backend, no accounts, no analytics.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-5B5BD6) ![React](https://img.shields.io/badge/React-19-5B5BD6) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-5B5BD6) ![Vite](https://img.shields.io/badge/Vite-6-5B5BD6)

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — module boundaries, messaging, errors, storage, permissions, build pipeline
- [Platform adapters](./docs/ADAPTERS.md) — detection, account identity, metadata, formats, resilience
- [Download engine](./docs/DOWNLOADS.md) — service API, states, progress, cancellation, retry, folder choice
- [Instagram module](./docs/INSTAGRAM.md) — page/media support, in-page buttons, profile grids, stories, Skip Downloaded
- [UI guide](./docs/UI.md) — design system, surfaces, components, demo mode and the mock boundary
- [Privacy policy](./PRIVACY.md)
- [Module status](#module-status)

## Module status

- **Module 1 — Extension Foundation:** complete. MV3 skeleton, build pipeline, shared types, typed messaging, centralized error boundary, and package verifier.
- **Module 2 — Premium MediaVault UI:** complete. Popup, side panel, settings, full history page, account selection page, bulk selection toolbar, queue/progress interface, empty/error states, and toasts. A clearly isolated demo-data mode makes every surface reviewable without touching real downloads.
- **Module 3 — Platform Detection & Media Discovery:** complete. A shared `PlatformAdapter` contract, per-platform page type/account detection, normalized metadata (post id/date/source/formats/status), download options, graceful failure handling, and dedicated detection/metadata tests.
- **Module 4 — Single Media Download System:** complete. A platform-independent `DownloadService` with typed states, Chrome-confirmed completion, real byte progress, pause/resume, cancellation, retry, Save As folder choice, duplicate handling, history persistence, and startup reconciliation.
- **Module 5 — Instagram Media Downloader:** complete. Photo/video/carousel/reel/profile-picture/story/highlight discovery, inline post action buttons, profile-grid overlay buttons, caption/source export, and Skip Downloaded deduplication.

All downloads use Chrome's Downloads API directly. No media is uploaded, proxied, or fetched through an external server.

## What it does

- Scans the **current page** for media that is already visible and downloadable.
- Detects the platform, page type, and visible account for Instagram, Facebook, and TikTok.
- Extracts direct media URLs and permitted metadata from rendered DOM and public embedded page data.
- Reports supported formats and availability without assuming every platform exposes the same fields.
- Downloads one media file per job through Chrome's Downloads API with safe filenames, duplicate handling, real progress, pause/resume, cancellation, and retry.
- Lets Chrome prompt for a destination folder (Save As) or uses the configured local subfolder.
- Tracks local download history in IndexedDB with a side-panel library and a full history page.
- Shows page/account context, current/bulk download actions, a select mode, and a live queue preview.
- Adds Instagram download buttons beside post actions and on accessible profile-grid items.
- Saves profile pictures, carousel slides, reels, and directly accessible story/highlight media where permitted.
- Copies caption + account + source URL from the popup.
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

To choose the destination folder yourself, enable **Settings → Downloads → Ask where to save each file**. Chrome then shows its native Save As dialog for every download. Otherwise Chrome saves to your default download folder plus the configured subfolder.

Enable **Settings → Downloads → Skip Downloaded** to block media already completed in local history. The popup and in-page toasts distinguish “already downloaded” from unavailable media.

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
  history/           Full download history page
  accounts/          Account selection preview page
  components/        UI primitives, layout, media, queue, accounts, history, providers
  hooks/             Settings, theme, tab, access, scan, selection, downloads, history, queue
  services/          Typed messaging, permissions, tabs, scan orchestration, errors, navigation
  mocks/             UI-only sample accounts/media/queue/history/preview preferences
  adapters/          PlatformAdapter contract, base pipeline, metadata normalization
    instagram/ facebook/ tiktok/   adapter + page-type + account + extraction
    instagram/                    profile stories/grid/profile-picture + in-page targets
  downloads/         DownloadService engine, Chrome client, safe filename builder, queue facade
  storage/           chrome.storage settings/sites + IndexedDB history
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
12. Profile/feed crawling is intentionally absent.
13. Page type/account/date detection depends on what the platform exposes; unavailable fields remain empty.
14. Stories, highlights, tagged posts, and saved collections are scanned only when the content is already visible/accessible.
15. Chrome 116+ desktop only.
16. Platform DOM changes can break extraction and in-page button placement until adapters are updated.
17. Chrome Web Store review may scrutinize social downloader extensions; use is limited to content you are authorized to save.

## Testing and verification

Verified in this repository:

```bash
npm run typecheck   # strict TypeScript, app + configs
npm run lint        # ESLint, zero warnings/errors
npm run test:run    # 140 tests passing
npm run build       # loadable dist/ + manifest/package verification
```

Coverage includes platform/page/account detection, metadata normalization, formats and download options, blob/restricted media, graceful extraction failure, the download service (pending/downloading/completed/failed/cancelled, browser-confirmed completion, byte progress, pause/resume, cancellation, retry, Save As, duplicates, Skip Downloaded, typed history), Instagram profile pictures/grid/story targets, in-page overlay injection, caption export, filename safety, URL normalization, settings/history/sites storage, typed messaging, site permissions, background router dispatch/error boundaries, popup states, demo-mode isolation, mock queue/history/account data, the history page, account cards, and the queue preview.

**Not yet verified here:** live end-to-end downloads against Instagram, Facebook, and TikTok. That requires loading `dist/` in Chrome and testing with real pages you are authorized to access. The manual QA checklist:

- Popup renders in light, dark, and system themes.
- Unsupported page shows the limitation; supported-but-disabled page shows the permission gate.
- Enabling a site allows scanning without a reload.
- Demo mode shows the platform switcher, page/account card, queue preview, and simulated current/bulk/select actions without calling Chrome Downloads.
- On a live post/reel/story/highlight/tagged/saved page, the context card reflects the adapter-detected page type and visible account.
- Instagram post action rows show an inline Download button; profile-grid items show compact download overlays; login/private pages show none.
- Profile picture, carousel, reel, and direct story/highlight media are discoverable and downloadable where accessible.
- Copy caption & source URL places the expected text on the clipboard.
- Skip Downloaded blocks a second completed copy and reports it distinctly.
- Account selection persists and the popup page-context card reflects the chosen mock account.
- Full history page shows stats, filters, empty state, and clear confirmation.
- Side panel switches between Library and Queue; footer links open history/accounts/settings.
- A real download shows browser byte progress; completion appears only after Chrome finishes.
- Cancel works for queued and in-flight jobs; retry restarts a failed job; Save As opens Chrome's folder picker.
- Expired links fail with a rescan message rather than a false success.
- Blob-only video shows a limitation and no unsafe attempt.
- Revoking access removes the content script and restores the gate.
- Keyboard-only navigation, 320px side panel, and reduced-motion behavior.

## Privacy and compliance

Read [PRIVACY.md](./PRIVACY.md). MediaVault does not collect, transmit, or sell any data. Only download media you have permission to save. MediaVault does not bypass access controls, strip watermarks, or defeat DRM.
