# MediaVault 1.0.0 — Release Report

## Implemented

- Manifest V3 extension foundation, build pipeline, package verification, and security audit.
- Powered popup, side panel, options, history, dashboard, stories, accounts, relationship export, and privacy surfaces.
- Instagram/Facebook/TikTok adapters for page/account detection, media metadata, stories/highlights, and visible relationships.
- Chrome Downloads single/bulk queue with Chrome-confirmed completion, byte-only progress, concurrency 1–3, pause/resume, cancel, manual/automatic retry, dedupe, and Skip Downloaded.
- Folder organization, safe filename variables/templates/preview/export, highlight-title folders, duplicate handling.
- Image format conversion (local), highest exposed video source, thumbnail/caption/metadata sidecars, actual output reporting.
- Advanced settings: new-media memory, auto-retry, bulk confirmation, notifications, automatic history clearing, Reset settings, Reset everything.
- Download dashboard: active/completed/failed/cancelled counts, known sizes only, per-file tiles, thumbnails/account/filename/status/error, queue progress, retry/cancel/open, clear completed.
- Native shadow-DOM download buttons for Instagram posts/Reels/stories/profile pictures/profile grids, Facebook posts/Reels/stories/albums, and TikTok videos/stories/profile grids, with detecting/downloading/completed/failed states.
- Direct media URL validation and Instagram embedded direct-video resolution; page URLs, manifests, and blob-only streams are rejected rather than mislabeled.
- Saved lists and sequential manual profile workflow; strict JSON import/export.
- Relationship CSV/JSON export from visible rows or official data exports, filtering/field selection.
- Privacy status, permission overview, local-data clearing, and honest Ghost Mode section.
- Production ZIP, changelog, install guide, store listing draft, privacy policy draft, security audit.

## Tested

### Automated

- Strict TypeScript.
- ESLint with zero warnings/errors.
- 250 tests across 46 files.
- Security audit: manifest allowlist, CSP, optional-origin allowlist, no static content scripts, no eval/new Function/dangerous HTML/cookies.
- Production pages/content builds and `verify:dist` (15 entry files).
- Unit/integration coverage includes adapters, formats, download service, browser-confirmed completion, retries, cancellation, notifications, sidecars, folder/filename, settings validation, imports/exports, dashboard, privacy, routers, and UI.

### Real Chrome smoke test

Environment: Chrome 157.0.8103.38 headless via ChromeDriver 157 + WebDriver BiDi `webExtension.install` (branded Chrome no longer accepts `--load-extension`).

Verified:

- unpacked extension installed successfully;
- `popup.html`, `sidepanel.html`, `options.html`, `dashboard.html`, `history.html`, `stories.html`, `accounts.html`, and `relationships.html` rendered their expected headings;
- zero runtime/log exceptions on all eight pages;
- a real localhost image was queued through typed background messaging and completed;
- a real localhost `.mp4` was queued as a video and completed;
- Chrome reported both downloads complete;
- files were written under the expected `MediaVault/instagram/...` paths with matching byte counts;
- test files and history entries were removed afterward.
- Native platform button behavior was validated with fixture DOM tests, not authenticated live platform pages.
- Public Instagram post DOM was inspected in Chrome: Save is a nested `role="button"` in a two-cell action row. A 40px probe placed 4px left of the Save wrapper had zero overlap with Like/Comment/Share/Save and did not move the native row.
- Public Facebook exposed text-only Like/Comment controls but no authenticated Share action; TikTok did not expose a public video action rail without login, so those placements remain fixture-verified.

### Not tested live

- Real Instagram/Facebook/TikTok pages with authenticated sessions.
- Native button placement against current production platform markup.
- Real video audio verification from a platform source.
- Real bulk queue/cancel/retry interaction in Chrome.
- Popup/sidepanel click-through interactions in Chrome.
- Extension reload/restart persistence in Chrome.
- Live image conversion against CDN CORS/permissions.
- Chrome Web Store review and signed-package installation.

## Unsupported / intentionally not implemented

- Private-account/login/DRM/access-control bypass.
- MSE/DASH/blob stream reconstruction or separate audio/video remuxing.
- Profile crawling, automatic scrolling, or hidden follower scraping.
- Anonymous story viewing, view-tracking bypass, or DM read-receipt manipulation.
- Cookie/token/password access.
- Backend, cloud sync, analytics, proxy, or remote executable code.
- Persistent arbitrary absolute download folders (Chrome only supports relative Downloads paths or Save As).

## Known bugs / limitations

Three real detection defects were found by tracing the pipeline against live pages and fixed; see below. One platform-side download failure remains (TikTok CDN), documented honestly.

Resolved in this pass (verified in real Chrome against live pages):

- Public TikTok pages were marked `restricted` because gating read `<script>` i18n payloads. Fixed; TikTok now resolves the video plus thumbnail as `available`.
- Public Facebook pages showed a blocking login wall because of a persistent header password field. Fixed; Facebook photos now download with no limitations.
- Profile-scoped media URLs detected as `unknown`. Fixed for Instagram and Facebook.

Verified live in Chrome (release build):

- Instagram Reel video: completed, valid MP4, H.264 + AAC audio preserved.
- Instagram image and profile-grid button download: completed, valid JPEG.
- Facebook photo downloads: completed, valid PNG/JPEG, correct extensions.
- Instagram in-page buttons mounted on a live profile (13: profile picture + grid) and a button click completed a real download.

Remaining release limitation:

- TikTok video files may still fail with `SERVER_FORBIDDEN` from `chrome.downloads` even though the page exposes a direct MP4 URL and plays it. The same URL 403s for a plain request, for a request from the page context, and for a direct page-anchor click while the page continues to play via a `blob:`/MSE stream. This is TikTok CDN anti-bot behavior keyed on request fingerprint, not the extension; the thumbnail from the same page downloads normally. Downloads may succeed on other networks/sessions, and this path is reported honestly as a failure rather than a false success.

Release limitations:

- Signed CDN URLs expire and may need a rescan.
- Official relationship export formats vary.
- Highlight/story relationship availability is platform-controlled.
- Notifications are opt-in and may reveal filenames on the OS.
- Ghost Mode is local trace reduction only.
- “Total files” and “known size” reflect retained local history, which can be pruned/cleared.
- Native Save As prompts may appear per file/sidecar.
- Real platform E2E remains a release gate.

## Release instructions

1. `npm install --include=dev`
2. `npm run check`
3. Confirm `dist/manifest.json` version `1.0.0`.
4. Create the archive:

```bash
mkdir -p release
rm -f release/mediavault-1.0.0.zip
(cd dist && zip -qr ../release/mediavault-1.0.0.zip .)
```

5. Load `dist/` via `chrome://extensions` → Load unpacked for local QA.
6. Run the manual QA matrix with real authorized pages.
7. Upload `release/mediavault-1.0.0.zip` to the Chrome Web Store developer dashboard.
8. Complete store privacy questionnaire using `PRIVACY.md`, `docs/PRIVACY_POLICY_DRAFT.md`, and `docs/SECURITY_AUDIT.md`.
9. Add screenshots/promo assets before submission.

## Final status

Code, automated verification, production build, ZIP, and a real-Chrome smoke test are complete. Full live-platform E2E and store submission are **not** complete and must not be marked as such until performed.
