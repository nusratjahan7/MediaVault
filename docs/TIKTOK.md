# TikTok Module — Module 7

## Supported discovery

All TikTok-specific logic lives under `src/adapters/tiktok/`.

| Surface | Support |
| --- | --- |
| Current video | Direct playback/download source from public embedded page data |
| Video thumbnail | Cover image saved as a separate downloadable image |
| Slideshow/photo post | Each rendered image with its direct URL |
| Profile video list | Multiple embedded items when public page data exposes them |
| Profile cards | Visible video cards become link-only entries plus downloadable thumbnails |
| Feed/tagged/saved surfaces | Embedded item lists where exposed |
| Private / login-gated content | Blocking limitation; no access attempted |

## Multi-item extraction

`parse-embedded-state.ts` reads `__UNIVERSAL_DATA_FOR_REHYDRATION__` and legacy `SIGI_STATE`, collecting:

- the primary `webapp.video-detail` item;
- item arrays under `webapp.user-detail` and other public detail/list containers;
- legacy `ItemModule` entries.

Each item is deduplicated by id/source. No signed internal API (for example X-Bogus endpoints), anti-bot token, or authenticated endpoint is called. Only public page data and rendered DOM are used.

## Metadata

- Platform, account username/display name, per-item author.
- Caption, post id, source page URL, item post URL.
- `createTime` converted from seconds to milliseconds.
- Video dimensions/duration, cover/thumbnail.
- Formats: playback MP4 first, download-copy MP4 second when exposed.
- Download status: available, unsupported, restricted, unknown.

## Original quality and thumbnails

- `playAddr` is preferred as the primary video URL; `downloadAddr` is offered as an alternate format when different.
- No transcoding or re-hosting.
- Video cover images become downloadable `tiktok-thumbnail` image items when no slideshow images exist.
- Profile-card poster images are downloadable; the video card itself is marked unavailable until the video page is opened.
- Slideshow audio is a separate track and is not downloaded.

## Profile discovery and bulk selection

- Public embedded profile item lists can yield multiple videos with direct URLs; the popup supports bulk selection and the shared `DownloadService`.
- Profile cards without embedded direct media appear as non-downloadable video links with a clear “open this video” reason.
- A `lazy-loaded` limitation explains the profile-card behavior.
- Profile filtering keeps items to the profile owner when an author id is available.

## Unavailable and expired media

- Private/login states produce blocking limitations.
- Blob-only playback is reported as unsupported; no stream reconstruction.
- Signed TikTok URLs expire; a `signed-url-expiry` limitation tells the user to download while the page is open.
- Failed/expired downloads use the shared engine’s actionable error messages and retry flow.

## Export and downloads

- Popup **Copy caption & source URL** supports TikTok as well as Instagram/Facebook.
- **Download current** enqueues the opened video/slideshow media.
- Bulk selection supports all accessible video/image/thumbnail items.
- Skip Downloaded applies through the shared engine.

## Tests

`tests/adapters/tiktok-module.test.ts` covers video + thumbnail metadata, multi-video profile discovery, profile-card link behavior, and private content.

Existing TikTok tests cover embedded video/slideshow metadata, legacy `SIGI_STATE`, blob-only limitations, and no-media behavior. The popup test verifies bulk selection of two accessible TikTok videos.
