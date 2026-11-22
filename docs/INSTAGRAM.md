# Instagram Module — Module 5

## Supported discovery

The Instagram adapter lives entirely under `src/adapters/instagram/`:

| Page / media | Support |
| --- | --- |
| Single photo post | Direct `og:image` / rendered image |
| Single video post | Direct `og:video` / rendered `<video>` |
| Carousel | Each rendered slide with a direct URL; unsupported slides are skipped |
| Reel | Direct video from meta or `<video>`; blob-only streams are reported unsupported |
| Profile picture | Header/profile image or profile `og:image` where exposed |
| Story / highlight | Rendered image/video only when Instagram exposes a direct file |
| Profile grid | Visible grid image with its linked post URL/id |
| Feed posts | Rendered post media with post links for per-post actions |

Unavailable or protected content returns limitations such as `login-required`, `private-content`, `blob-video`, `partial-extraction`, or `unsupported-media`. No login, private-account, anti-bot, or access-control bypass is attempted.

## In-page download buttons

`findInstagramActionTargets()` (`src/adapters/instagram/in-page.ts`) owns all Instagram-specific placement logic:

- Post/feed/reel articles → an inline **Download** button added to the post action row.
- Profile/tagged/saved grids → a compact overlay button on each accessible grid item.
- Stories/highlights → one overlay button on the active media container.
- Login/private pages and pages without visible media → no buttons.

The generic overlay (`src/content/in-page-actions.ts`) mounts isolated shadow-DOM buttons, stops anchor navigation, shows its own toast feedback, and never injects on demo-mode pages.

Clicking a post button queues all accessible items for that post (carousel included). Clicking a grid button queues that visible grid image and tells the user that opening the post is required for the original media.

## Original media and limitations

- Direct media URLs are queued unchanged; no transcoding or rehosting.
- Single-post/carousel/reel media uses original URLs exposed by the page.
- Profile-grid buttons necessarily use the image Instagram rendered in the grid, not the original post media. A limitation explains this.
- Stories and highlights are limited to what is already visible and directly addressable.
- Signed CDN URLs expire; failures tell the user to reload/rescan.

## Caption and source export

The popup shows **Copy caption & source URL** on Instagram pages. It builds:

```
<caption>

Account: @username
Source: https://www.instagram.com/p/...
```

Missing fields are omitted, and an empty result has a clear fallback. Copying happens locally via the clipboard API.

## Skip Downloaded

Settings → Downloads → **Skip Downloaded** is off by default. When enabled, the download service checks local history for a completed item with the same media id or URL and refuses to enqueue a duplicate with `ALREADY_DOWNLOADED`.

- Results in the popup and in-page toasts distinguish “already downloaded” from “no direct link”.
- History is local; deleting the completed entry (or disabling Skip Downloaded) allows another copy.
- History disabled means no completed record exists to compare.

## Popup

Existing popup flow now shows:

- platform/page/account context;
- Download current / Bulk / Start select;
- profile pictures and grid media as selectable items;
- caption/source export;
- queue preview with real Chrome progress.

## Tests

- `tests/adapters/instagram-module.test.ts` covers profile pictures, grid post metadata, story/highlight media, unsupported stories, inline targets, and login-wall suppression.
- `tests/content/in-page-actions.test.ts` verifies shadow-DOM injection and click handling.
- `tests/unit/export.test.ts` covers caption/source export.
- `tests/downloads/{service,queue}.test.ts` cover Skip Downloaded and dedupe results.
