# Install MediaVault 1.0.0

## Requirements

- Chrome 116 or newer (Manifest V3, side panel, downloads.open).
- Node.js 20+ and npm for source builds.
- MediaVault does not require an account, server, or API key.

## Build from source

```bash
cd MediaVault
npm install --include=dev
npm run check
```

`npm run check` runs ESLint, the security audit, all tests, strict typecheck, both Vite builds, and `verify:dist`.

The loadable extension is in `dist/`. A release archive is created at:

```text
release/mediavault-1.0.0.zip
```

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `dist/` folder (not the repository root and not the ZIP).
5. Pin MediaVault if desired.
6. Open an Instagram, Facebook, or TikTok page.
7. Click the MediaVault toolbar icon and **Enable on this site**.
8. Scan and choose **Download current**, **Bulk download**, or **Start select**.

## Install from the ZIP

For a packaged Chrome Web Store submission, upload `release/mediavault-1.0.0.zip`. For local testing, unzip it and load the extracted folder with **Load unpacked**.

## Permissions and first run

- `storage`, `downloads`, `downloads.open`, `notifications`, `scripting`, `activeTab`, `sidePanel`.
- Optional host access is requested per platform only after an explicit click.
- Optional media-CDN access is requested only from **Format & quality** when local image conversion is selected.
- Notifications and image conversion are off by default.

## Troubleshooting

- **No scan:** confirm site access is enabled, reload the platform tab, and click the popup again.
- **Download fails:** signed URLs expire; reload/rescan the page. Check Chrome download settings and free space.
- **File name too long:** shorten the template in Settings → Downloads.
- **No notifications:** enable **Show download notifications** and check OS/Chrome notification permissions.
- **Image conversion falls back:** grant media-processing access in Format & quality; otherwise the original format is saved with a note.
- **Reset:** Settings → Privacy & data → Reset settings or Reset everything.

## Verification / uninstall

- Uninstalling removes extension storage and IndexedDB according to Chrome behavior. Downloaded files remain in Downloads.
- Site permissions can be revoked in Settings → Site access or `chrome://extensions`.
