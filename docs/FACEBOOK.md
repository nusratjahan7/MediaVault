# Facebook Module — Module 6

## Supported discovery

All Facebook-specific logic lives under `src/adapters/facebook/`.

| Surface | Support |
| --- | --- |
| Photo post | Direct `og:image` / rendered photo |
| Video post | Direct MP4/WebM sources from meta, DOM, or exposed embedded page data |
| Album | Each rendered album photo with its `fbid`/post URL |
| Reel | Same direct-video rules as videos; page type `reel` |
| Profile / page | Directly rendered photos/videos/media on the page |
| Feed | Rendered post photos and direct video sources |
| Story / highlight | Detected page types; only media exposed directly on the page |

### URL formats handled

- `/photo/?fbid=…`, `/photo.php?fbid=…`
- `/permalink.php?story_fbid=…`, `/posts/…`
- `/watch/?v=…`, `/videos/…`, `/video.php?v=…`, `/reel/…`, `/reels/…`
- `/media/set/?set=a.…`, `/album.php?album_id=…`, `/photos/album/…`
- `/profile.php?id=…`, `/pages/…`, `/people/…`, named profile/page paths
- `/stories/…`, `/highlights/…`, `?sk=saved`, `?sk=tagged`, `?sk=album`

## Facebook metadata

- **Account:** visible author link text/href, falling back to `og:title` without the Facebook suffix. Numeric `profile.php` accounts may have a display name but no username.
- **Caption:** `og:description` or the rendered post message.
- **Post date:** page `data-utime` epoch values, then `article:published_time`/`datePublished`.
- **Post id:** `fbid`, `v`, `story_fbid`, or path ids.
- **Photo links:** album/feed images carry their linked `fbid` and absolute photo URL; album items are tied to their own photo, not just the album page.
- **Formats:** direct image or video URL inference; embedded `hd_src`/`sd_src`/`playable_url` data can expose multiple MP4 options.
- **Source page URL:** the page being scanned.
- **Download status:** available, unsupported (blob/adaptive), restricted (login/private), or unknown.

## Video safeguards

Facebook does not guarantee a downloadable video file.

- `og:video` is accepted only when it looks like a direct media URL (video extension or an `fbcdn.net` media path).
- A page-only video URL is rejected with a clear limitation.
- `<video src="blob:…">` / MSE playback is marked unsupported, not reconstructed.
- Embedded HD/SD URLs are used when present; otherwise a direct DOM source is used.
- If no direct video remains, the adapter reports that adaptive/DASH or page-hosted video cannot be saved.

## Albums and profile/page surfaces

- Album downloads include only photos Facebook has rendered; scrolling may load more.
- Album photos include per-photo post ids and source URLs.
- Profile/page media discovery is limited to what is visible without login. Private or restricted content is never bypassed.
- Login walls and private-content states produce blocking limitations.

## Export and downloads

- The popup shows **Copy caption & source URL** for Facebook pages as well as Instagram.
- **Download current**, bulk, and selection use the shared `DownloadService`.
- Unavailable photos/videos are shown with a clear reason; expired links surface the standard rescan guidance from the download engine.
- Skip Downloaded applies to Facebook media through the shared engine.

## Tests

`tests/adapters/facebook-module.test.ts` covers albums with per-photo ids, embedded HD/SD video sources, reels, page-only video rejection, profile/page media discovery, and alternate photo URL formats.

Existing Facebook tests cover photo metadata, blob video, direct `og:video`, and login walls. Platform-detection tests cover the expanded URL/page-type matrix.
