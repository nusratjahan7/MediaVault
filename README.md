# MediaVault

A premium, privacy-first Chrome extension for saving media you are authorized to access from Instagram, Facebook, and TikTok. Everything runs locally in your browser — no backend, no accounts, no analytics.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-5B5BD6) ![React](https://img.shields.io/badge/React-19-5B5BD6) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-5B5BD6) ![Vite](https://img.shields.io/badge/Vite-6-5B5BD6)

## What it does

- Scans the **current page** for media that is already visible and downloadable.
- Extracts direct media URLs from rendered DOM and public embedded page data.
- Queues downloads through Chrome's Downloads API with safe filenames and platform subfolders.
- Tracks local download history in IndexedDB and shows it in a side panel library.
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
| `npm run build` | Typecheck, build UI/background, then the IIFE content script |
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
4. Scan runs automatically. Select media and click **Download N**.
5. Open **Library** in the side panel to review, retry, reveal, or remove entries.

Site access is stored per platform. Revoke it in Settings → Site access.

## Architecture

```
src/
  background/        MV3 service worker: message router, scan and site handlers
  content/           Silent SPA-aware scanner (IIFE, injected only after approval)
  popup/             Media detection, selection, download flow
  options/           Appearance, downloads, site access, privacy/data
  sidepanel/         Local download library
  components/        UI primitives, media, history, settings, providers
  hooks/             Settings, theme, tab, site access, scan, selection, downloads, history
  services/          Typed messaging, permissions, tabs, scan orchestration
  adapters/          Platform adapters + shared DOM extraction helpers
    instagram/ facebook/ tiktok/
  downloads/         Filename builder, Chrome Downloads client, concurrency queue
  storage/           chrome.storage settings/sites + IndexedDB history
  types/             Strict shared contracts and message unions
  utils/             URL, filename, formatting, errors, logging, hashing
```

**Flow:** popup → typed message → service worker → on-demand content-script injection → adapter scan → `ScanResult` → selection → download queue → `chrome.downloads` → IndexedDB history → side panel.

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
4. Signed CDN URLs expire — download while the page is open.
5. Carousels/slideshows include only rendered slides.
6. Profile/feed crawling is intentionally absent.
7. Chrome 116+ desktop only.
8. Platform DOM changes can break extraction until adapters are updated.
9. Chrome Web Store review may scrutinize social downloader extensions; use is limited to content you are authorized to save.

## Testing and verification

Verified in this repository:

```bash
npm run typecheck   # strict TypeScript, app + configs
npm run lint        # ESLint, zero warnings/errors
npm run test:run    # 73 tests passing
npm run build       # loadable dist/
```

Coverage includes filename safety, URL normalization, all three adapters (including blob and private-content cases), settings/history/sites storage, the download queue (start, completion, failure, cancellation, history-off), typed messaging, site permissions, and popup state rendering.

**Not yet verified here:** live end-to-end downloads against Instagram, Facebook, and TikTok. That requires loading `dist/` in Chrome and testing with real pages you are authorized to access. The manual QA checklist:

- Popup renders in light, dark, and system themes.
- Unsupported page shows the limitation; supported-but-disabled page shows the permission gate.
- Enabling a site allows scanning without a reload.
- Public Instagram post/reel, Facebook photo, TikTok video/slideshow scan and download.
- Blob-only video shows a limitation and no unsafe attempt.
- Cancel/retry/failure flows update the library.
- Revoking access removes the content script and restores the gate.
- Keyboard-only navigation and reduced-motion behavior.

## Privacy and compliance

Read [PRIVACY.md](./PRIVACY.md). MediaVault does not collect, transmit, or sell any data. Only download media you have permission to save. MediaVault does not bypass access controls, strip watermarks, or defeat DRM.
