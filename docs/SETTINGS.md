# Complete Settings — Module 18

Settings live in `chrome.storage.local` under `mediavault:settings:v1` and are validated field-by-field by `coerceSettings`. Changes apply immediately where they affect new work.

| Setting | Default | Behavior |
| --- | --- | --- |
| Download folder | `MediaVault` | Sanitized relative path under Downloads |
| Folder per account | Off | Adds the visible account folder |
| Split by media type | Off | Adds images/videos inside useful categories |
| Category folders | On | posts/videos/reels/stories/highlights |
| Filename template | `{platform}-{author}-{id}` | Safe tokens, preview, saved templates, reset |
| Image format | Original | Local JPG/PNG/WebP conversion with fallback |
| Download thumbnails | Off | Thumbnail sidecar when distinct |
| Save captions | Off | `.caption.txt` sidecar |
| Save metadata | Off | `.metadata.json` sidecar |
| Skip Downloaded | Off | Checks completed history |
| Download new media only | Off | Separate completed-fingerprint memory that survives history clearing |
| Bulk concurrency | 2 | Clamped 1–3 |
| Automatic retries | 0 | Clamped 0–3; same source/concurrency |
| Confirm before bulk | Off | Multi-item popup queue confirmation |
| Download notifications | Off | Chrome completion/failure notifications for main files |
| Automatic history clearing | Never | Never/1/7/30 days; terminal entries only |
| Save history | On | IndexedDB history toggle |
| History limit | 500 | Retained-entry cap |
| Theme | System | Light/Dark/System |
| Ask where to save | Off | Chrome native Save As |
| Media processing access | Off | Optional CDN access for local image conversion |

## Reset

- **Privacy & data → Reset settings** restores preferences only.
- **Reset everything** clears preferences, history, saved lists, download memory, workflow, session selections, and preview IDs. Site access remains separately revocable; downloaded files stay on disk.

## Descriptions/tooltips

Settings rows include explanatory copy; new advanced controls also expose `title` tooltips. Toggles have accessible labels.

## Implementation guarantees

- Empty/invalid folder/template values are repaired.
- Retry count, history retention options, concurrency, formats, and theme are validated.
- No UI-only toggles: every listed setting is read by the download service, popup, dashboard, history, or privacy UI.

## Tests

Settings storage tests cover defaults/coercion; DownloadSection, FormatSection, and PrivacySection component tests cover persistence/UI; service tests cover retries, notifications, and new-media memory; dashboard/history tests cover retention and aggregate behavior.
