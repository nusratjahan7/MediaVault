# Security & Privacy Audit — Module 20

Audit scope: Manifest V3 package, background service worker, content script, extension pages, storage, messaging, imports/exports, downloads, notifications, and optional media processing.

## Manifest permissions

| Permission | Why it exists | Notes |
| --- | --- | --- |
| `storage` | Settings, site access, saved lists, download memory, session selection/workflow | Local to the Chrome profile |
| `downloads` | Start/monitor/cancel/resume downloads | No arbitrary filesystem access |
| `downloads.open` | Open a completed file from the dashboard | Requires a user click |
| `notifications` | Optional completion/failure notifications | Off by default; main files only |
| `scripting` | Inject the scanner after a site is enabled | Dynamic, site-scoped registration |
| `activeTab` | Identify the current tab when the user opens the popup | No broad tab access |
| `sidePanel` | Local library/queue UI | Chrome 116+ |

No `cookies`, `webRequest`, `tabs`, `history`, `management`, `unlimitedStorage`, or host permissions are requested at install.

### Optional host permissions

- Instagram, Facebook, TikTok pages — requested only when the user enables that site.
- Media CDN origins (`cdninstagram.com`, `fbcdn.net`, `tiktokcdn*`, `ibytedtos.com`) — requested only from Format & quality for local image conversion.
- Optional access is revocable from Settings or Chrome.

### Content scripts

There are no static content scripts in the manifest. `chrome.scripting.registerContentScripts` registers only the enabled platform's exact origin patterns. Registration is reconciled when permissions change or the worker restarts.

### CSP

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

No remote scripts, eval, new Function, or remote executable code are used.

## Data stored locally

| Key / store | Contents | Purpose |
| --- | --- | --- |
| `mediavault:settings:v1` | Preferences | Settings persistence |
| `mediavault:sites:v1` | Enabled platforms | Restore site access |
| `mediavault:preview:accounts:v1` | Mock IDs | UI preview only |
| `mediavault:saved-lists:v1` | List names, platforms, usernames, profile URLs, optional display names | Saved lists |
| `mediavault:download-memory:v1` | Platform/media-ID fingerprints + timestamps | “Download new media only”; no URLs/captions |
| `mediavault:profile-workflow:v1` | Selected saved profiles + index | Session workflow |
| `mediavault:selection:v1:<tabId>` | Selected media metadata | Session bulk selection |
| IndexedDB `mediavault`/`history` | Filename, platform, status, media/thumbnail URLs, timestamps, bytes, errors, output notes | Local dashboard/history |

No passwords, cookies, tokens, messages, emails, or payment data are stored. Saved-list imports ignore unknown/private fields.

## Network requests

| Destination | Trigger | Data |
| --- | --- | --- |
| Instagram/Facebook/TikTok pages | User opens a page and enables access | Extension reads rendered DOM only |
| Platform media CDNs | User clicks download | Chrome Downloads fetches the direct media URL; Chrome may attach cookies per its normal download behavior, but MediaVault never reads them |
| Platform media CDNs | Optional image conversion | Extension `fetch` with `credentials: 'omit'`; no upload |
| Thumbnail CDNs | UI rendering | Direct `<img>` load with `referrerPolicy="no-referrer"` |
| Official privacy/export links | User click | Normal browser navigation |

No backend, analytics, telemetry, cloud sync, remote fonts, proxy, relay, or third-party services exist.

## Validation and input handling

- Background messages are checked for type, sender extension id, and per-request payload shapes before handlers run.
- Downloads are accepted only with an array of valid media records, bounded by the scan limit.
- Saved-list JSON is fully validated before storage; malformed JSON, missing fields, invalid usernames/URLs, duplicate names, and excessive counts are rejected.
- Relationship JSON/CSV is validated, kind-isolated, field-limited, and capped.
- Settings imports are coerced field-by-field.
- Filenames, folder segments, titles, usernames, captions, locations, and sidecar names are sanitized; `..`, separators, absolute paths, reserved names, control characters, and overlength names cannot escape the download root.
- React escapes rendered text. No `dangerouslySetInnerHTML` is used. The content-script button uses a fixed static icon string only.
- CSP, security audit script, and package verifier run in the build gate.

## User control

- Downloads come from popup/in-page user actions, dashboard retry, or the configured automatic retry after a user-started download.
- There is no profile crawling, auto-scroll, hidden follower scraping, or background media discovery.
- Saved-list workflows open profiles for manual download.
- Relationship export uses visible rows or a user-chosen official export.
- Ghost Mode does not claim anonymity or bypass view/read-receipt controls.

## Privacy risks

1. Optional host access allows reading visible content on enabled platforms; access is explicit and revocable.
2. Downloaded files, filenames, history, saved lists, and relationship exports can be sensitive if another person can access the browser profile or Downloads folder.
3. Chrome notifications may reveal filenames on the OS; notifications are opt-in and exclude sidecars.
4. Image conversion makes a direct CDN request without credentials; the CDN already hosts the media, but it can observe the request.
5. Signed media URLs stored in history may expire; they are only local.
6. Social-media downloader extensions can face Chrome Web Store policy scrutiny; users must only save authorized content.

## Remaining limitations

- A real Chrome 157 headless smoke test installed the extension, rendered all eight extension pages with zero runtime errors, and completed one localhost download through the background/Downloads path. Authenticated platform E2E, live popup/sidepanel interactions, and extension-reload persistence remain release gates.
- Official relationship export formats vary by platform and may require parser updates.
- Chrome controls cookie attachment for `downloads.download`; MediaVault does not access those cookies.
- Local storage is protected by the browser profile, not application-level encryption.
- Official platform privacy settings/links can change.

## Recommended follow-ups

- Add a “history contents” mode that omits media URLs/captions entirely.
- Add optional per-entry deletion from dashboard/history (history already supports it).
- Run a signed manual Chrome E2E matrix before store submission.
- Review optional CDN origins when platform CDNs change.
- Keep dependency and CSP audits in CI.

## Verification

- `npm run audit:security` checks the permission allowlist, optional origins, CSP, absence of static content scripts, and risky source patterns.
- Full lint, typecheck, unit/integration tests, production build, and `verify:dist` are required before release.
