# Native Download Buttons & Video Source Fix

## Placement

| Platform / surface | Mount | Behavior |
| --- | --- | --- |
| Instagram post/feed | 40px icon immediately left of the Save wrapper in the native action row | Downloads all rendered carousel media for that post |
| Instagram Reel/video | Beside Save when present; action row or overlay fallback | Downloads the current Reel/video only |
| Instagram story/highlight | Story dialog, right edge, vertically centered | Downloads only the currently displayed story media |
| Instagram profile picture | Immediately after the profile image | Downloads the highest rendered profile image |
| Instagram profile grid | Top-right of each rendered grid/reel cover | Downloads that specific item |
| Facebook post/video | 36px icon immediately after Share | Downloads current photo/video; video posts are single-item |
| Facebook Reel | 36px icon immediately before Like | Downloads the current Reel only |
| Facebook story | Story dialog, left edge, vertically centered | Downloads only the current story |
| Facebook album | Top-right of each linked album photo | Downloads that album image |
| TikTok video/story | 34px icon immediately after the Share action | Downloads the current video or story video |
| TikTok profile grid | Top-right of each video/photo card | Prefers a direct video; otherwise saves the available thumbnail |

Placement is not shared across platforms. Each adapter resolves its own action control and picks the smallest action row that actually contains that control, then mounts relative to the row-level wrapper. This avoids wrapping a third child under Instagram's two-cell action row and avoids anchoring to an entire post container.

Instagram post/reel controls use 40px targets with 24px icons, Facebook post/reel controls use 36px targets with 20px icons, TikTok uses 34px targets with 20px icons, and grid/profile-picture overlays use 28–32px targets. The Instagram post icon is absolutely positioned 4px left of Save, so it does not change the native action-row layout.

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
6. **Gating read `<script>` payloads.** `detectPrivateContent`/`detectLoginWall` scanned `document.body.textContent`, which includes serialized page data. TikTok ships its i18n dictionary in `<script>`, and that dictionary contains “this account is private” on *every* page. Every public TikTok page was therefore marked `restricted` with `private-content`, so no media was ever downloadable and no in-page buttons mounted. Detection now reads rendered text only (`visiblePageText`), which excludes `script`/`style`/`noscript`/`template`/`svg`.
7. **A persistent header login form blocked public content.** Facebook renders a password field on public pages that still expose rendered media, so `detectLoginWall` reported a blocking wall even though the visible photos downloaded fine. Pages that actually render media (a `video`/`article`, or an image at or above `MIN_IMAGE_SIZE`) are no longer treated as login-gated.
8. **Profile-scoped media URLs were typed `unknown`.** Instagram and Facebook nest media under a profile (`/@user/reel/…`, `/<page>/videos/…`, `/<page>/posts/…`). Those pages fell through to `unknown`, so `isPostPage`/`isVideoPage` was false and video/photo extraction was skipped. Both page-type detectors now match the profile-scoped forms.

## Completion feedback

`DOWNLOAD_STATUS` returns current records for the accepted queue ids. The content button polls at 1.2s intervals (bounded) and shows a success toast only after Chrome confirms `completed`; failures/cancellations show useful errors and re-enable retry. No progress or completion is fabricated.

## Supported / unsupported

Supported: direct host images/videos, Instagram direct MP4 variants, Facebook directly hosted MP4/WebM, TikTok direct playback/download URLs, carousel/album image sets, story images/videos with direct sources, profile images, rendered grid images, and thumbnails.

Unsupported or restricted: blob/adaptive/MSE-only video, HLS/DASH manifests, DRM, private/login content, separate audio/video streams requiring remuxing, page-only video URLs, and audio that is not part of the selected source file. MediaVault does not merge streams or claim audio exists when the source is video-only.

## Tests

- `tests/downloads/media-resolver.test.ts` — page/blob/manifest rejection, CDN acceptance.
- `tests/adapters/instagram-video.test.ts` — embedded direct versions and page-link rejection.
- `tests/adapters/gating-regression.test.ts` — embedded `<script>` phrases no longer block public pages; genuine visible private/login pages still block; a header login form with rendered media does not; profile-scoped Instagram/Facebook media URLs resolve and mount buttons.
- `tests/adapters/platform-buttons.test.ts` — Instagram profile/grid/story/post, Facebook post/reel/album/story, TikTok video/profile-grid placement, control-relative anchoring, scoped selection, duplicate prevention, removal, and failed/retry state.
- `tests/content/in-page-actions.test.ts` — button injection, title/accessibility, completed state, cleanup.
- `tests/background/router.test.ts` — `DOWNLOAD_STATUS` validation and response.
- `tests/downloads/service.test.ts` — page URL rejection.

## Live placement check

The public Instagram post DOM was inspected in Chrome. Save is a `role="button"` containing `svg[aria-label="Save"]`; it sits in a separate wrapper in a two-cell action row. The final 40px probe was placed 4px left of that wrapper at the same vertical center, with no overlap against Like, Comment, Share, or Save and without moving the native row. The public Facebook page exposed text-only Like/Comment controls but not the authenticated Share action, and TikTok did not expose a public video action rail without login, so those authenticated placements remain fixture-verified rather than live-verified.

Live authenticated platform downloads and audio tests have not been run in this environment. Fixture button/selection tests and a real-Chrome page/image/video download smoke test passed; authenticated platform E2E remains required. The reference screenshots were not present in the workspace, so spacing follows the platform action controls measured from the live DOM.
