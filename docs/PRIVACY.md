# Privacy, Data Controls & Ghost Mode — Module 16

## Local-only mode

MediaVault has no backend, cloud sync, analytics, telemetry, remote account, or server-side storage. Settings, download history, saved lists, and selections stay in this Chrome profile. The Privacy & data page shows **Local-only mode: enforced** as a status, not as a claim that platform activity is hidden.

## Data controls

- **Save download history** can be turned off; existing history remains until cleared.
- **Clear history** removes IndexedDB history entries after confirmation.
- **Clear saved lists** removes local lists and the active profile workflow after confirmation.
- **Reset everything** clears history, lists, workflow, session selections, preview selections, and settings. Downloaded files remain on disk.

## Permission overview

The settings page explains every requested permission:

- `storage` — local settings/history/lists/selection.
- `downloads` — save files and track Chrome-confirmed progress.
- `scripting` + `activeTab` — inject the scanner only for a site the user explicitly enabled.
- `sidePanel` — local library/queue UI.
- Optional host access — platform pages, plus media CDN access only for local image conversion when requested.

Current per-platform access and media-processing status are shown. Access is revocable.

## Ghost Mode

Ghost Mode is a **local trace reduction** section. It explicitly does **not**:

- hide story views or interfere with view tracking,
- hide DM read receipts or access private messages,
- bypass authentication, privacy controls, or rate limits,
- claim anonymity the platform can still observe.

Local controls link to Privacy & data, and official platform privacy settings are provided. No workaround for anonymous viewing is implemented.

## Relationship export privacy

Relationship exports use only visible rows the user can already see or a locally chosen official data export. No cookies, tokens, private APIs, automatic scrolling, or server upload are used.

## Saved lists privacy

Saved lists contain only platform, username, profile URL, optional display name, and timestamps. Passwords, cookies, tokens, emails, and messages are never stored. Imported JSON is validated before saving.
