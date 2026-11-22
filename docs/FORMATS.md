# Media Format & Quality — Module 13

Settings → **Format & quality** controls output preferences. Preferences are local; actual queued output is shown in queue and history entries.

## Images

- **Original format** is the default.
- JPG, PNG, and WebP are produced locally with `createImageBitmap` + `OffscreenCanvas` (`src/services/image-conversion.ts`).
- Supported inputs: JPEG, PNG, WebP, AVIF. GIF/unknown types fall back to the original with a visible note.
- Conversion requires optional **media processing** access so the extension can read the image URL from supported CDN hosts. Fetch uses `credentials: 'omit'`; nothing is uploaded.
- The image is re-encoded at quality 0.92 for JPG/WebP. It is **not lossless**. Dimensions are preserved; no upscaling.
- If access is denied, the fetch fails, the browser lacks canvas support, or the type is unsupported, the original file is saved and the history entry shows the fallback note.

## Video

- **Highest available source** picks the best source exposed by the page (quality metadata, then resolution label). It never invents qualities.
- **Exact source URL** preserves the page's current source.
- Videos are not transcoded. The extension does not promise 4K, 60fps, lossless, or a specific audio track.
- Audio is preserved only when it is part of the selected source file.
- Separate audio/video streams are **not merged or remuxed** because no permitted local remux pipeline is implemented. The UI states this clearly.

## Sidecars

When enabled:

- **Download thumbnails** writes `<name>.thumbnail.<ext>` when the page exposes a thumbnail different from the media URL.
- **Save captions as text** writes `<name>.caption.txt` when a caption exists; it also includes source URL and publication timestamp when known.
- **Save source metadata** writes `<name>.metadata.json` with platform, media ID, author, media type, caption, location, source URL, page URL, publication date/time, download time, selected preferences, and actual queued output.

Sidecars are queued through the same `DownloadService`, respect the same folder structure and concurrency limit, and appear in history separately.

## Output reporting

- `DownloadOutputInfo` is persisted with queue records and history:
  - extension and MIME type,
  - source quality,
  - display label (e.g. `MP4 · HD`, `PNG · Converted`, `TXT · Caption`),
  - conversion/fallback note.
- Queue rows and history rows show the actual output label; history shows fallback notes.
- Media cards show the exposed source format/quality.
- Options shows the selected image format and video quality preference.

## Chrome API notes

- Converted images and text/JSON sidecars are downloaded through `chrome.downloads.download` using local data URLs. This path is implemented and covered by mocked tests; live Chrome E2E is still required.
- Optional CDN host permissions are only requested from the Format & quality section when conversion is selected.
- No arbitrary filesystem writes, remote conversion services, or media uploads are used.

## Tests

`tests/downloads/output.test.ts`, `tests/downloads/sidecars.test.ts`, `tests/downloads/service.test.ts`, `tests/components/format-section.test.tsx`, and `tests/storage/settings.test.ts` cover preference persistence, highest-source selection, conversion success/fallback, output metadata, sidecars, and UI reporting.
