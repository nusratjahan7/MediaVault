# MediaVault Privacy Policy

MediaVault is designed to work entirely on your device. There is no MediaVault server, account, analytics pipeline, or telemetry.

## Data we collect

**None.** We do not collect, transmit, sell, or share personal data, browsing history, media, cookies, authentication tokens, or usage statistics.

## Data stored on your device

| Storage | Contents | Purpose |
| --- | --- | --- |
| `chrome.storage.local` (`mediavault:settings:v1`) | Theme, download folder, filename template, auto-scan, history preferences | Keep your preferences |
| `chrome.storage.local` (`mediavault:sites:v1`) | Platforms you enabled | Restore site access after a restart |
| IndexedDB `mediavault` → `history` | Filename, platform, status, media URL, thumbnail URL, timestamps, optional bytes/error | Local download library |

Nothing in this storage is uploaded anywhere. Only extension pages and the service worker can read it.

## Permissions and what they access

- **`storage`** — local settings and enabled-site list.
- **`downloads`** — start downloads and read their status; reveal a saved file when you ask.
- **`scripting`** — inject the scanner only after you approve a specific site.
- **`activeTab`** — determine which tab the popup was opened on.
- **`sidePanel`** — display the local library.
- **Optional host access** — requested per platform when you click "Enable on this site." Only that platform's origin is granted. Revoking it unregisters the scanner.

MediaVault never requests Chrome's `cookies` permission and does not read passwords, form fields, messages, authentication tokens, or account data.

## Network activity

- The extension itself makes **no network requests** to MediaVault or any analytics service.
- Thumbnails in the popup and library load directly from the platform CDN URLs present on the page, with `referrerPolicy="no-referrer"`. This reveals your IP to the platform, as any image request would.
- Downloads are fetched by Chrome directly from the media URL the page exposes.
- No proxy, relay, or remote code is used.

## Retention and deletion

- **Clear history** (side panel or Settings → Privacy & data) deletes IndexedDB history entries. Files already downloaded are not deleted.
- **Reset everything** clears history and restores default settings.
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
