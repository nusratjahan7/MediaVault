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
- 249 tests across 46 files.
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

No critical defects were found in the automated gate or Chrome smoke test.

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
