# MediaVault Privacy Policy

MediaVault is designed to work entirely on your device. There is no MediaVault server, account, analytics pipeline, or telemetry.

## Data we collect

**None.** We do not collect, transmit, sell, or share personal data, browsing history, media, cookies, authentication tokens, or usage statistics.

## Data stored on your device

| Storage | Contents | Purpose |
| --- | --- | --- |
| `chrome.storage.local` (`mediavault:settings:v1`) | Theme, download folder, filename template, auto-scan, history preferences, demo-mode flag, Save-As and Skip-Downloaded preferences | Keep your preferences |
| `chrome.storage.local` (`mediavault:sites:v1`) | Platforms you enabled | Restore site access after a restart |
| `chrome.storage.local` (`mediavault:preview:accounts:v1`) | Mock preview account IDs only | Remember the UI-preview account per platform |
| `chrome.storage.local` (`mediavault:saved-lists:v1`) | List names, platforms, usernames, profile URLs, optional display names | Local saved-list management; no credentials |
| `chrome.storage.session` (`mediavault:profile-workflow:v1`) | Selected saved profiles and workflow index | Sequential manual profile workflow; cleared with the browser session |
| `chrome.storage.session` (`mediavault:selection:v1:<tabId>`) | Selected media metadata per browser tab (up to 200 items) | Restore bulk selection across popup reopen/tabs; cleared with the browser session |
| IndexedDB `mediavault` → `history` | Filename, platform, status, media URL, thumbnail URL, timestamps, optional bytes/total/paused/error | Local download library |

Nothing in this storage is uploaded anywhere. Only extension pages and the service worker can read it.

## Permissions and what they access

- **`storage`** — local settings and enabled-site list.
- **`downloads`** — start downloads and read their status; reveal a saved file when you ask.
- **`scripting`** — inject the scanner only after you approve a specific site.
- **`activeTab`** — determine which tab the popup was opened on.
- **`sidePanel`** — display the local library.
- **Optional host access** — requested per platform when you click "Enable on this site." Only that platform's origin is granted. Revoking it unregisters the scanner.

MediaVault never requests Chrome's `cookies` permission and does not read passwords, form fields, messages, authentication tokens, or account data. Page type and account identity are inferred only from content already rendered on the page you opened; no account or session API is used.

Relationship export uses only follower/following rows already rendered on an authorized page or a local official-export file the user chooses. It does not use cookies, private APIs, automatic scrolling, or server uploads. Saved lists contain only usernames, profile URLs, and optional display names. Ghost Mode does not hide story views, DM read receipts, authentication, or identity and makes no anonymity claim.

## Network activity

- The extension itself makes **no network requests** to MediaVault or any analytics service.
- Thumbnails in the popup and library load directly from the platform CDN URLs present on the page, with `referrerPolicy="no-referrer"`. This reveals your IP to the platform, as any image request would.
- Downloads are fetched by Chrome directly from the media URL the page exposes. MediaVault does not proxy, relay, transcode, or upload media. When **Ask where to save each file** is enabled, Chrome's native folder picker controls the destination.
- In UI-preview (demo) mode, thumbnails are local SVG data URIs, sample media uses non-resolvable `preview.mediavault.local` URLs, and no download request is made.
- Instagram in-page buttons read only media already rendered on the page you authorized. They are not injected on login/private pages or in demo mode.
- TikTok and Facebook discovery use only rendered DOM and public embedded page data. No signed internal API, anti-bot token, or authenticated endpoint is used.
- Caption/source copying happens locally through the clipboard and is never uploaded.
- Skip-Downloaded checks use local history only.
- Optional image conversion reads the selected image from supported media CDN hosts with `credentials: 'omit'`, decodes/re-encodes it locally with the browser canvas, and never uploads it. Access is requested only when conversion is selected. If access is unavailable or conversion fails, the original file is saved.
- Thumbnail/caption/metadata sidecars are generated locally and downloaded through Chrome's Downloads API.
- Stories/highlights are read only from content already visible in your current authorized session. MediaVault does not provide anonymous story viewing, hide or alter your viewing activity, or bypass private-account/platform privacy controls. The platform may record views according to its policies.
- No proxy, relay, or remote code is used.

## Retention and deletion

- **Clear history** (side panel or Settings → Privacy & data) deletes IndexedDB history entries. Files already downloaded are not deleted.
- **Reset everything** clears history, restores default settings, and removes mock preview selections.
- Turning off **Demo data mode** leaves preview account IDs in local storage until you reset data; they contain only mock identifiers and no platform information.
- **Uninstalling** the extension removes its local storage and IndexedDB database according to Chrome's extension data removal behavior.
- Disabling download history prevents new entries from being written.

## Third parties

MediaVault does not integrate third-party analytics, advertising, crash reporting, or cloud services. Platform media and thumbnails come directly from Instagram, Facebook, and TikTok under their own privacy policies.

## Children's privacy

MediaVault does not knowingly collect data from anyone, including children, because it does not collect data at all.

## Changes

If this policy changes, the updated version ships with the extension source. The extension has no mechanism to transmit policy changes to a server.

## Contact

This is a local-first project; use the repository's issue tracker for privacy questions. Do not include personal data or media URLs in reports.
