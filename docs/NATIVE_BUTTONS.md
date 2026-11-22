# Native Download Buttons & Video Source Fix

## Placement

| Platform / surface | Mount | Behavior |
| --- | --- | --- |
| Instagram post/feed | Existing Like/Comment/Share/Save action row | Downloads all rendered carousel media for that post |
| Instagram Reel/video | Same action row or overlay fallback | Downloads the current Reel/video only |
| Instagram story/highlight | Story dialog, left edge | Downloads only the currently displayed story media |
| Instagram profile picture | Immediately after the profile image | Downloads the highest rendered profile image |
| Instagram profile grid | Top-right of each rendered grid/reel cover | Downloads that specific item |
| Facebook post | Existing Like/Comment/Share row | Downloads current photo/video; video posts are single-item |
| Facebook Reel | Existing action row | Downloads the current Reel only |
| Facebook story | Story dialog, left edge | Downloads only the current story |
| Facebook album | Top-right of each linked album photo | Downloads that album image |
| TikTok video/story | Native Like/Comment/Share action controls | Downloads the current video or story video |
| TikTok profile grid | Top-right of each video/photo card | Prefers a direct video; otherwise saves the available thumbnail |

Buttons are icon-only with `title="Download"`, use the extension's own neutral styling, isolate CSS in a shadow root, and expose Idle/Detecting/Downloading/Completed/Failed states. Failed buttons become retry buttons. Duplicate hosts are prevented by target id, SPA changes refresh/remove hosts, and disconnected media removes its button.

## Media resolution

`src/downloads/media-resolver.ts` validates every resolved URL before Chrome Downloads receives it:

- must be HTTP(S), not blob/data;
- rejects platform page URLs;
- rejects HLS/DASH manifests and segments;
- accepts known media CDN hosts or a recognized media extension/MIME;
- rejects unknown extensionless hosts rather than saving an HTML page as `.mp4`.

Base enrichment uses the resolver for downloadable status/formats, and `DownloadService` revalidates before enqueue. Output format selection can only choose validated direct video sources.

Instagram now reads direct `video_versions` / `playable_url` data already embedded in the current post/reel/story page, in addition to `<video>` sources and `og:video`. Page-link `og:video` values are rejected. Facebook embedded/direct video handling is restricted to single video/reel/post/story surfaces so feed data cannot leak into another post. TikTok playback/download URLs are validated before use.

## Root cause of previous video failures

1. The previous check was effectively “is this HTTP?”, so Instagram/Facebook/TikTok **page URLs** or stream manifests could be marked as videos. Chrome then downloaded HTML/playlist text under an `.mp4` name.
2. Instagram Reels/stories often render a `blob:` video and expose a page link in `og:video`; direct embedded video versions were not parsed.
3. Click-time logic reused a 2-second cached scan and did not wait for the video source/embedded state, so the button could run before a direct source existed.
4. Buttons only existed for Instagram, used generic styling, and reported enqueue success rather than waiting for Chrome-confirmed completion.
5. Facebook embedded video extraction was global on feed surfaces, risking a different post’s video.

## Completion feedback

`DOWNLOAD_STATUS` returns current records for the accepted queue ids. The content button polls at 1.2s intervals (bounded) and shows a success toast only after Chrome confirms `completed`; failures/cancellations show useful errors and re-enable retry. No progress or completion is fabricated.

## Supported / unsupported

Supported: direct host images/videos, Instagram direct MP4 variants, Facebook directly hosted MP4/WebM, TikTok direct playback/download URLs, carousel/album image sets, story images/videos with direct sources, profile images, rendered grid images, and thumbnails.

Unsupported or restricted: blob/adaptive/MSE-only video, HLS/DASH manifests, DRM, private/login content, separate audio/video streams requiring remuxing, page-only video URLs, and audio that is not part of the selected source file. MediaVault does not merge streams or claim audio exists when the source is video-only.

## Tests

- `tests/downloads/media-resolver.test.ts` — page/blob/manifest rejection, CDN acceptance.
- `tests/adapters/instagram-video.test.ts` — embedded direct versions and page-link rejection.
- `tests/adapters/platform-buttons.test.ts` — Instagram profile/grid/story/post, Facebook post/reel/album/story, TikTok video/profile-grid placement, scoped selection, duplicate prevention, removal, and failed/retry state.
- `tests/content/in-page-actions.test.ts` — button injection, title/accessibility, completed state, cleanup.
- `tests/background/router.test.ts` — `DOWNLOAD_STATUS` validation and response.
- `tests/downloads/service.test.ts` — page URL rejection.

Live authenticated platform DOM and audio tests have not been run in this environment. Fixture button/selection tests and a real-Chrome page/image/video download smoke test passed; authenticated platform E2E remains required.
