# MediaVault Architecture

## 1. Scope and module status

Module 1 (Extension Foundation) is complete: Manifest V3, React/TypeScript/Vite/Tailwind build, popup, options, background service worker, content-script entry point, icons/metadata, shared contracts, typed messaging, centralized error handling, local persistence, and documentation.

Module 2 (Premium UI) is complete: page/account context, current/bulk/select actions, queue preview, Library/Queue side panel, full history page, account-selection page, toast/empty/error states, and a mock-data preview mode. Mock content is isolated under `src/mocks/`; demo mode never calls `chrome.downloads`.

Module 3 (Platform Detection & Media Discovery) is complete: a shared `PlatformAdapter` contract, per-platform page type and account detection, normalized metadata (post id/date/source/formats/status), supported download options, graceful failure handling, and dedicated detection/metadata tests.

Module 4 (Single Media Download System) is complete: a platform-independent `DownloadService` with typed states, Chrome-confirmed completion, real byte progress, pause/resume, cancellation, retry, Save As folder choice, duplicate handling, local history, and startup reconciliation. The engine uses Chrome's Downloads API directly and never proxies media.

Module 5 (Instagram Media Downloader) is complete: profile pictures, grid media with linked post context, carousel/reel/story/highlight discovery, inline post-action buttons, profile-grid overlay buttons, caption/source export, and Skip Downloaded deduplication. Instagram selectors live in the adapter; the overlay UI is isolated and generic.

Module 6 (Facebook Media Downloader) is complete: photos, direct videos, rendered album items with per-photo ids, reels, visible profile/page media, Facebook URL/page-type detection, `data-utime` dates, embedded HD/SD sources, caption export, and a direct-video guard that rejects page-only or adaptive streams.

Module 7 (TikTok Media Downloader) is complete: current videos, thumbnail assets, slideshows, multi-item public profile discovery, profile-card link handling, playback/download formats, caption export, and bulk selection through the shared engine.

Module 8 (Bulk Download & Start Select) is complete: per-tab session-persisted selection, checkbox selection mode, select-all/clear/remove, configurable 1–3 concurrency, per-item queue pause/resume/cancel/retry, failure summaries, and per-platform folder preservation.

Module 10 (Stories & Highlights Manager) is complete: `StoryMedia`/`HighlightMedia` models, per-adapter story/highlight discovery, expiration info, story/highlight saves, highlight covers, title-based folders, and explicit anonymity/authorization limits.

Module 11 (Folder Organization & Filename Rules) is complete: platform-independent folder derivation, optional account/category/media-type folders, highlight-title folders, filename variables/templates/previews, sanitization, traversal prevention, length limits, and duplicate handling through Chrome `uniquify`.

Module 13 (Media Format & Quality) is complete: image output preferences with local canvas conversion, highest-exposed-source video selection, thumbnail/caption/metadata sidecars, and selected/actual output reporting. No video transcoding or audio/video remux is implemented.

Module 14 (Account Manager & Saved Lists) is complete: local list CRUD, profile management, multi-select, strict JSON import/export with confirmation, and a sequential manual profile workflow.

Module 15 (Account Relationship Export) is complete: visible followers/following discovery, user-chosen official export import, filtering, field selection, and local CSV/JSON download with kind isolation.

Module 16 (Privacy & Ghost Mode) is complete: enforced local-only status, saved-list/history/all-data clearing, permission overview, and an honest Ghost Mode section with no anonymity workaround.

Module 18 (Advanced Download Settings) is complete with validated new-media memory, auto-retry, bulk confirmation, notifications, automatic history clearing, and full settings UI.

Module 19 (Download Dashboard) is complete with local snapshot aggregation, queue tiles, byte-only progress, known sizes, retry/cancel/open, and completed-entry clearing.

Module 20 (Security & Privacy Audit) is complete with an explicit CSP, permission allowlist, payload validation, import validation, sanitization, and `docs/SECURITY_AUDIT.md`.

Module 21 (Production Release) is prepared as 1.0.0 with production build, ZIP, docs, and a real-Chrome smoke test.

Native download buttons now cover Instagram, Facebook, and TikTok through platform-specific target finders, a shared shadow-DOM button controller, scoped media selection, and Chrome-confirmed status polling. Direct-video validation and embedded Instagram video resolution prevent page URLs/manifests from being saved as `.mp4`.

## 2. Runtime topology

```
┌────────────────────────────── Extension pages ──────────────────────────────┐
│  Popup                 Options              Side panel                       │
│  • page/account ctx    • appearance         • Library                        │
│  • scan + select       • downloads          • Queue                          │
│  • current/bulk/select • site access        • history actions                │
│  • queue preview       • UI preview mode                                     │
│                                                                              │
│  History page (React)                  Accounts page (React)                 │
│  • stats/filters/search                • preview account selection           │
│  • retry/reveal/delete/clear           • mock-only, no session access        │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ typed chrome.runtime messages
                                   ▼
┌────────────────────────── Background service worker (ESM) ──────────────────┐
│  router.ts                                                                  │
│   ├─ validates message shape + sender.id                                    │
│   ├─ runRequest() error/response boundary                                   │
│   └─ handlers: scan · sites · history · downloads                           │
│  services/permissions.ts   dynamic content-script registration              │
│  downloads/service.ts      typed download engine + Chrome Downloads         │
│  downloads/organization.ts platform-independent folder derivation           │
│  downloads/filename.ts     paths, templates, safe segments                  │
│  downloads/output.ts       image/video output resolution + sidecar metadata │
│  downloads/queue.ts        background/UI compatibility facade               │
│  storage/*                 chrome.storage.local + IndexedDB                 │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ chrome.tabs.sendMessage / executeScript
                                   ▼
┌──────────────────────── Content script (IIFE, opt-in) ──────────────────────┐
│  content/index.ts    injection guard + SCAN_PAGE responder                  │
│  content/scanner.ts  adapter resolution + discovery + dedupe + limits       │
│  content/observer.ts SPA URL/mutation invalidation                          │
│  content/in-page-actions.ts  shadow-DOM download overlay + toasts           │
│  adapters/*          PlatformAdapter: detect page/account, discover media,  │
│                      normalize metadata/formats, fail gracefully            │
│  adapters/instagram/in-page.ts  post/grid/story button placement            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Trust boundaries**

- Content scripts run only after the user grants optional host access and the background registers them.
- Only extension contexts (`sender.id === chrome.runtime.id`) may call the background router.
- UI surfaces never receive cookies, tokens, or raw credentials; adapters only read rendered DOM and public embedded page state.

## 3. Folder responsibilities

| Path | Responsibility |
| --- | --- |
| `src/background/` | Service-worker bootstrap, message router, request handlers, site registration |
| `src/content/` | Scanner lifecycle, SPA invalidation, platform button registry/controller, isolated shadow-DOM actions |
| `src/popup/` | Page/account context, permission gate, actions, selection mode, queue preview, scan results |
| `src/options/` | Settings sections, UI preview mode, local data controls |
| `src/sidepanel/` | Library and Queue views with history/stories/account/settings links |
| `src/dashboard/` | Download dashboard with aggregate stats and queue tiles |
| `src/history/` | Full history page with stats, filters, pagination, and actions |
| `src/stories/` | Stories & highlights manager page |
| `src/accounts/` | Saved-lists manager plus preserved interface-preview account picker |
| `src/relationships/` | Visible/official-export follower/following CSV & JSON export page |
| `src/components/` | UI primitives, layout shell, media/history/queue/context/account/settings components, providers |
| `src/hooks/` | Reusable state and chrome-API orchestration, plus preview queue/account/history hooks |
| `src/mocks/` | UI-only sample data and preview preferences; never imports download services |
| `src/services/` | Messaging, permissions, tabs, scan orchestration, centralized error boundary, page navigation |
| `src/adapters/` | Platform URL matching/extraction + shared DOM helpers |
| `src/downloads/` | `DownloadService`, media-URL resolver, Chrome client, folder/filename/output, sidecars, queue facade |
| `src/storage/` | Settings/sites/lists/download-memory in `chrome.storage.local`; workflow/selection in session; history in IndexedDB |
| `src/types/` | Strict contracts, messages, saved lists, relationship entries, UI contracts |
| `src/utils/` | URL, filename/templates, format labels, profile validation, relationship CSV/JSON, files, ID, errors |
| `src/services/image-conversion.ts` | Local canvas conversion and text data URLs; optional CDN access |
| `public/` | Manifest and PNG icons copied verbatim into `dist/` |
| `scripts/` | Icon generation and built-package verification |
| `tests/` | Vitest unit/component tests, Chrome mock, DOM fixtures |

## 4. Shared contracts

| Type file | Contents |
| --- | --- |
| `types/platform.ts` | `PlatformId`, `PlatformMeta`, `SiteStatus` |
| `types/page.ts` | `PageType`, `PlatformDetection`, `AccountIdentity` |
| `types/media.ts` | `MediaItem`, `MediaKind`, `MediaFormat`, `DownloadOption`, `MediaDownloadStatus`, `ScanResult` |
| `types/story.ts` | `StoryMedia`, `HighlightMedia` |
| `types/download.ts` | `DownloadSource`, `DownloadOutputInfo`, `DownloadRecord`, `EnqueueResult` |
| `types/settings.ts` | `Settings`, `ThemePreference`, `FilenameTemplate`, image/video preferences |
| `types/history.ts` | `HistoryEntry`, `DownloadStatus`, `HistoryQuery`, `HistoryPage` |
| `types/messages.ts` | Request union, payload map, `ApiResponse<T>`, push events |

`ApiResponse<T>` is the only cross-context result shape:

```ts
type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
```

### Platform adapter contract

Every platform implements `PlatformAdapter` (`src/adapters/types.ts`):

```ts
matches(url)                    // URL ownership
detectPlatform(url)             // { platform, supported, url }
detectPageType(ctx)             // profile/feed/post/reel/video/story/highlight/tagged/saved/album/unknown
identifyAccount(ctx)            // visible account identity or null
discoverMedia(ctx)              // AdapterDiscovery { platform, pageType, account, items, limitations }
extractMetadata(ctx)            // MediaItem[]
discoverStories?(ctx, discovery)    // StoryMedia[]
discoverHighlights?(ctx, discovery) // HighlightMedia[]
getDownloadOptions(item)        // DownloadOption[]
```

`BasePlatformAdapter` owns the shared resilience pipeline: safe page/account detection, extraction try/catch, per-item URL validation, dedupe, blocking-restriction handling, metadata enrichment, and format inference. Each platform supplies only `matches`, `detectPageType`, `identifyAccount`, and raw extraction.

Normalized metadata never assumes parity across platforms. Missing usernames, dates, post ids, thumbnails, formats, or direct URLs remain `undefined` rather than being fabricated. Page-specific notes (blob streams, signed URL expiry, carousel limits) travel as `ScanLimitation`s. Page types and account detection are covered in [ADAPTERS.md](./ADAPTERS.md).

### Instagram-specific layer

- `extract.ts` adds profile pictures on profile pages, direct story/highlight media, and profile-grid images with each item's linked post URL/id.
- `in-page.ts` owns all placement selectors: post action rows, grid anchors, story/highlight media containers. It returns no targets on login/private pages.
- `verify-dist`-built content code mounts a shadow-DOM overlay only for Instagram, only after site access is enabled, and not in demo mode. Grid buttons save the rendered grid image and explicitly tell the user to open the post for original media.
- Caption + account + source URL export lives in `utils/export.ts`; Instagram and Facebook surface the copy action in the popup.
- Skip Downloaded is enforced in the shared download engine using local completed history (media id or URL). See [INSTAGRAM.md](./INSTAGRAM.md).

### Facebook-specific layer

- `page-type.ts` detects photos, posts, videos, reels, albums, stories/highlights, tagged/saved surfaces, and named/profile pages across Facebook URL variants.
- `extract.ts` adds per-photo album links/ids, `data-utime` dates, direct `og:video` validation, DOM video sources, and embedded `hd_src`/`sd_src`/`playable_url` formats.
- Page-only or adaptive video links are never treated as direct files; blocked/private/login states produce blocking limitations.
- Profile/page discovery is limited to visible rendered media. See [FACEBOOK.md](./FACEBOOK.md).

### TikTok-specific layer

- `parse-embedded-state.ts` collects primary and multi-item public embedded data (`__UNIVERSAL_DATA_FOR_REHYDRATION__`, legacy `SIGI_STATE`) without signed internal APIs.
- `extract.ts` normalizes videos, slideshow images, and downloadable cover thumbnails; profile cards without direct sources become clearly unavailable video links with downloadable posters.
- Formats prefer playback MP4, with a separate download-copy MP4 when exposed.
- Private/login/blob-only/exhausted states produce explicit limitations; signed URLs are never rewritten.
- Multiple accessible items feed the existing bulk selection UI and shared DownloadService. See [TIKTOK.md](./TIKTOK.md).

## 5. Message passing

**UI → background** — `services/messaging.ts`

- `sendToBackground(request)` is generic over `BackgroundRequest`; its return type is derived from the request's `type` via `BackgroundResponseMap`.
- Wraps `chrome.runtime.sendMessage` callbacks, rejects on `chrome.runtime.lastError`, and enforces `MESSAGE_TIMEOUT_MS`.
- Errors are surfaced as `AppError` with a stable code.

**Background → content** — `sendToTab(tabId, request)`

- Uses `chrome.tabs.sendMessage`, rejects when the receiver is absent, and enforces `SCAN_TIMEOUT_MS`.
- The scan handler injects `content.js` before messaging, so a cold tab succeeds without a manual reload.

**Background → UI pushes**

- `broadcastEvent({ type: 'DOWNLOADS_UPDATED', entries })` updates open popup/side panel views.
- `isDownloadsUpdatedEvent` validates the shape at the receiver.

**Router** — `background/router.ts`

1. Reject anything that is not a known request type.
2. Reject senders whose `sender.id` is not this extension.
3. Execute the handler inside `runRequest(...)`.
4. Call `sendResponse` once; return `true` to keep the channel open for async work.

To add a request: extend `BackgroundRequest`, add its payload to `BackgroundPayloadMap`, add a handler, add the type to `REQUEST_TYPES`, and add the switch case. TypeScript then forces the response type at every UI call site.

## 6. Centralized error handling

- `utils/errors.ts` defines `AppError` with a narrow `ErrorCode` union and the serialization helpers `toErrorPayload`, `fromErrorPayload`, and `getErrorMessage`.
- `services/error-handler.ts` (`runRequest`) is the single service-worker boundary: handlers throw, the boundary converts to `ApiResponse` and logs only the request type and error code (never URLs or page data).
- `services/messaging.ts` converts transport failures into the same `AppError` shape.
- UI hooks call `getErrorMessage` for display; raw exceptions never cross the messaging boundary.

Error codes: `PERMISSION_DENIED`, `NOT_SUPPORTED`, `TAB_UNAVAILABLE`, `CONTENT_SCRIPT_FAILED`, `SCAN_FAILED`, `DOWNLOAD_FAILED`, `INVALID_INPUT`, `STORAGE_FAILED`, `MESSAGE_FAILED`, `TIMEOUT`, `UNKNOWN`.

## 7. Local storage

| Store | Key / database | Shape |
| --- | --- | --- |
| `chrome.storage.local` | `mediavault:settings:v1` | `{ version: 1, data: Settings }` (includes `demoMode`, `askWhereToSave`, `skipDownloaded`) |
| `chrome.storage.local` | `mediavault:sites:v1` | `{ version: 1, platforms: PlatformId[] }` |
| `chrome.storage.local` | `mediavault:preview:accounts:v1` | Mock-only selected preview account per platform |
| `chrome.storage.session` | `mediavault:selection:v1:<tabId>` | Per-tab bulk selection (up to 200 media items), cleared with the browser session |
| IndexedDB | `mediavault` v1 → `history` | `HistoryEntry`, keyed by `id`, indexes on `createdAt`, `platform`, `status` |

- Settings are validated and clamped on every read/write; malformed or legacy values fall back to defaults.
- The options page and service worker both subscribe to `chrome.storage.onChanged`, so a settings change invalidates the worker's cache immediately.
- History writes are skipped when `historyEnabled` is false. Pruning respects `maxHistoryEntries`.
- All storage is local to the browser profile.

## 8. Permissions and least privilege

| Permission | Module | Rationale |
| --- | --- | --- |
| `storage` | Foundation | Local settings and enabled-site list |
| `scripting` | Foundation | Register/inject the scanner only after opt-in |
| `activeTab` | Foundation | Identify the tab when the user opens the popup |
| `sidePanel` | Foundation UI | Library surface (Chrome 116+) |
| `downloads` | Download engine | Save media and track progress |
| `downloads.open` | Dashboard | Open a completed file after a user click |
| `notifications` | Settings | Optional completion/failure notifications |
| `optional_host_permissions` | Foundation | Per-platform consent plus media-CDN access for local image conversion, requested at runtime |

Design rules enforced by the manifest and build verifier:

- No static `content_scripts`.
- No install-time host permissions.
- No `cookies`, `webRequest`, `tabs`, `history`, or management permissions.
- No HTML inline scripts; the default MV3 CSP applies.

## 9. Build pipeline

Two plain Vite builds produce one loadable folder:

1. **Page build** (`vite.config.ts`) — `popup.html`, `options.html`, `sidepanel.html`, `dashboard.html`, `history.html`, `accounts.html`, `stories.html`, `relationships.html`, and `src/background/index.ts` as an ESM service worker with a fixed `background.js` name. HTML/asset chunks are hashed under `assets/`.
2. **Content build** (`vite.content.config.ts`) — `src/content/index.ts` bundled to a single IIFE at the fixed path `content.js`. A fixed path is required for `chrome.scripting.registerContentScripts`; this is why a generic extension plugin is not used.

`public/manifest.json` and `public/icons/*` are copied verbatim; the eight HTML entry pages are emitted with hashed asset references by Vite.

**Scripts**

| Command | Purpose |
| --- | --- |
| `npm run dev` | Watch both builds into `dist/` (reload the unpacked extension manually) |
| `npm run build` | Typecheck → page build → content build → verify package |
| `npm run verify:dist` | Validate manifest fields, permissions, HTML references, and chunk imports |
| `npm run check` | Lint → tests → build |
| `npm run icons` | Rasterize the SVG mark into 16/32/48/128 PNGs |
| `npm run typecheck` / `lint` / `test:run` | Individual quality gates |

## 10. Download engine

`src/downloads/service.ts` exports `DownloadService` and the singleton used by the background.

```ts
enqueue(source, { autoStart? }) // pending job + optional history row
start(id?)                      // start one pending job or drain up to concurrency
pause(id) / resume(id)          // Chrome pause/resume when supported
cancel(id)                      // pending or in-flight cancellation
retry(id)                       // failed/cancelled -> fresh pending attempt
getStatus(id)                   // typed DownloadRecord
getHistory(limit?)              // session + persisted history merged
```

**Typed states:** `pending → downloading → completed | failed | cancelled`. Pause is a `paused` flag on a downloading record, not a separate state.

**Browser-confirmed completion:** the engine never sets `completed` from a timer or from starting the download. It only finalizes on Chrome's `state === "complete"` event or a fresh `downloads.search` result. Progress comes exclusively from `bytesReceived`/`totalBytes` during a 700 ms poll and is capped at 99% until Chrome confirms completion. If Chrome does not report a total, the UI shows an indeterminate bar.

**Cancellation:** pending jobs are cancelled in memory. In-flight jobs call `chrome.downloads.cancel`; `USER_CANCELED` maps to cancelled, while a download Chrome already completed stays completed.

**Output/folders:** `output.ts` resolves the highest exposed video source or the requested image conversion, then `filename.ts` builds a category/account/title path and the active template. Converted images use a local data URL for the Chrome download while history keeps the original source. Retry recomputes output and filename under current settings.

**Sidecars:** when enabled, the queue adds thumbnail, `.caption.txt`, and `.metadata.json` jobs through the same service/concurrency/folder rules. Sidecars carry explicit output metadata and use the main file's basename.

**Retry:** failed/cancelled records reuse their history id and source, regenerate a safe filename and output, and start a new Chrome download. Expired URLs result in actionable failure messages; they are never rewritten or guessed.

**Skip Downloaded:** when enabled, `enqueue` checks local history for a completed item with the same media id or URL and throws `ALREADY_DOWNLOADED`. The queue facade reports the count so popup and in-page surfaces can show a distinct message.

**Destination and duplicates:** `saveAs` is driven by Settings → Downloads → Ask where to save each file; otherwise Chrome uses the default download folder plus the configured subfolder. Filenames are sanitized and `conflictAction: 'uniquify'` prevents overwrites. Each path retains `MediaVault/<platform>/…` even for mixed-platform bulk selections.

**Concurrency:** the service accepts a clamped 1–3 parallel limit from settings (default 2). The background updates it on settings changes; pending jobs start as slots free. No unbounded fan-out is possible.

**Queue controls:** pause/resume/cancel/retry are exposed through typed messages and the queue preview. Failed items keep per-item errors and can be retried; the queue header summarizes failures.

**Reconciliation:** on startup, active history rows are searched in Chrome. In-progress downloads are reattached to polling, completed rows are finalized with byte counts, and missing/interrupted rows become failed with a clear message.

**Independence:** the service imports shared types, Chrome client wrappers, filename helpers, and local storage only. It never imports a platform adapter.

## 11. UI data modes

The UI reads through hooks that expose either live or demo data:

- `useHistory(enabled)` — production history from IndexedDB.
- `useDemoHistory()` — local sample history with filtering and delete/clear.
- `useLiveQueue(enabled)` — active/recent jobs from local history, refreshed by download events.
- `useMockQueue(enabled)` — deterministic simulated queue ticks.
- `useQueuePreview(demoMode)` — chooses one controller and exposes `mode: 'live' | 'demo'`.
- `usePreviewAccount(platform)` — reads mock account selection from the preview key.

`Settings.demoMode` (default `false`) switches between them. Mock data and preview preferences are confined to `src/mocks/`; no production module imports a mock queue or mock downloader. Turning the mode off restores live behavior without touching stored history or settings.

## 12. Extension points

**Add a platform adapter**

1. Add the platform to `PlatformId` and `PLATFORM_META`.
2. Implement `PlatformAdapter` (`matches`, `extract`) under `src/adapters/<platform>/`.
3. Register it in `adapters/registry.ts`.
4. Add fixtures and an adapter test.
5. The popup, permissions, and site list pick it up automatically.

**Add a new UI surface**

Add an HTML entry to `vite.config.ts`, a `src/<surface>/main.tsx` that composes the providers (`Settings → Theme → Toast`), and a manifest reference if Chrome should discover it.

**Add persisted data**

Use a versioned envelope in `chrome.storage.local`, or add an IndexedDB object store with an explicit schema version in `storage/db.ts`.

**Add a previewable surface**

Build the component with explicit props, add it to a page entry in `vite.config.ts`, then wire live and mock controllers behind a `demoMode` branch. Keep sample data in `src/mocks/` and never import download services into it.

## 13. Local development

See [README.md](../README.md#install-and-build). Short version:

```bash
npm install --include=dev
npm run build
# chrome://extensions → Developer mode → Load unpacked → dist/
```

## 14. Verification

- Strict TypeScript across `src/` and build configs.
- ESLint 9 with React hooks rules.
- Vitest (249 tests): platform/page/account detection, metadata parsing, formats/options, blobs/restrictions, story/highlight and relationship discovery, saved lists/import workflows, advanced settings, new-media memory, automatic retry, notifications, automatic history clearing, dashboard stats/tiles/actions, bulk confirmation, folder/filename rules, image conversion/fallback, sidecars, output reporting, download service lifecycle/retry/cancel/Save As/duplicates, queue controls, storage, messages/payload validation, permissions, router, popup, privacy UI, demo isolation, history, accounts, and previews.
- Real Chrome 157 headless smoke via ChromeDriver/WebDriver BiDi: extension installed, all eight pages rendered with zero runtime errors, and one localhost download completed through the background service worker and Chrome Downloads API.
- `verify-dist.mjs` checks the built package as Chrome would consume it, including all eight HTML surfaces.
- `security-audit.mjs` checks permission allowlists, self-only CSP, optional origins, no static content scripts, and risky-source patterns.

Live authenticated Chrome E2E against real social pages has **not** been run in this environment. The manual QA matrix is in the README.

## 15. Privacy boundaries

- No backend, analytics, telemetry, remote fonts, or remote code.
- No cookies, credentials, private messages, or auth tokens.
- Media URLs are read from the page; signed URLs are never modified or forged.
- Downloads are fetched by Chrome directly from the permitted media URL; nothing is proxied or uploaded.
- Platform thumbnails load directly from the platform CDN with `referrerPolicy="no-referrer"`; nothing is proxied.
- In-page buttons read only media already visible on the authorized page; login/private pages receive no buttons.
- Caption export copies text locally to the clipboard; nothing is uploaded.
- Bulk selections live in `chrome.storage.session` per tab, are never synced, and clear when the browser session ends.
- Stories/highlights are read only from content already visible in the authorized session; MediaVault does not provide anonymous viewing or conceal view activity.
- Image conversion fetches only the selected media URL from optional CDN hosts with `credentials: 'omit'`; decoding is local and nothing is uploaded. Denied/unavailable conversion falls back to the original.
- TikTok discovery uses public embedded page data only; no signed internal API or anti-bot token is used.
- Demo thumbnails are local SVG data URIs and demo actions never call Chrome Downloads.
- Private/restricted content is reported as a limitation, never bypassed.
