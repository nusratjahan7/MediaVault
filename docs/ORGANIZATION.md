# Folder Organization & Filename Rules — Module 11

## Folder structure

Folder derivation lives in `src/downloads/organization.ts` and imports only generic media/page types — no platform adapter code.

Order:

```
<downloadSubfolder>/<platform>/[account]/[category]/[highlight title]/[images|videos]/<filename>
```

- **Download folder** defaults to `MediaVault` relative to Chrome's Downloads folder.
- **Platform** is always included.
- **Account** is optional (`organizeByAccount`) and uses the visible username/author.
- **Category** is optional (`organizeByCategory`, on by default) and is one of:
  - `posts`
  - `videos`
  - `reels`
  - `stories`
  - `highlights`
- **Highlight title** is added under `highlights/` when a title is available.
- **Media type** is optional (`splitByMediaType`) and adds `images/` or `videos/` where it is not redundant. Video-only categories are not duplicated.
- **Filename** follows the active template.

Examples:

```
MediaVault/instagram/studio/posts/images/2026-11-22-studio-C8xY2aPq.jpg
MediaVault/instagram/highlights/Travel/videos/2026-11-22-studio-123.mp4
MediaVault/tiktok/videos/2026-11-22-creator-7301.mp4
```

## Choosing a destination

Chrome's Downloads API only accepts paths **relative to the Downloads directory**. MediaVault never writes to an arbitrary absolute path.

- Keep **Ask where to save each file** off to use the configured relative folder.
- Turn it on to use Chrome's Save As picker per file. This is the supported user-selected-folder path.
- Chrome adds a counter (`name (1).jpg`) because downloads use `conflictAction: 'uniquify'`.

## Filename variables

| Token | Meaning |
| --- | --- |
| `{username}` / `{author}` | Visible account username or display name |
| `{date}` | Publication date when known, otherwise download date |
| `{id}` | Internal media ID |
| `{mediaId}` / `{postId}` | Platform post/media ID when exposed |
| `{index}` | 1-based position in the download batch |
| `{caption}` | Shortened, filesystem-safe caption |
| `{location}` | Location metadata when the page exposes it |
| `{platform}` | `instagram`, `facebook`, or `tiktok` |
| `{mediaType}` / `{kind}` | `image` or `video` |
| `{ext}` | Actual output extension |

Unknown tokens are removed. Empty optional tokens produce nothing.

## Templates

Settings → Downloads provides:

- the active template input with token chips and a live sample path preview,
- **Saved templates** selection (built-in Default, Dated, Caption),
- **Save as template** with a reusable name,
- **Reset to default**.

The active template is stored in settings; saved templates are local-only and survive reloads.

## Safety rules

- Invalid characters (`< > : " / \ | ? *`) and control characters are removed.
- Path separators and `..` cannot escape the selected folder; account/category/title/filename segments are sanitized independently.
- Filenames are capped at 120 characters including the extension; sidecar names are shortened to fit.
- Server folder segments are capped at 40 characters.
- Duplicate names are handled by Chrome's `uniquify` conflict action.
- Only Chrome's Downloads API is used; no direct filesystem path is written by the extension.

## Tests

`tests/unit/filename.test.ts`, `tests/downloads/organization.test.ts`, `tests/components/download-section.test.tsx`, and `tests/storage/settings.test.ts` cover tokens, previews, template persistence, folders, sanitization, traversal, length, and selection/reset.
