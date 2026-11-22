# Platform Adapters — Module 3

## Contract

`src/adapters/types.ts`

```ts
interface PlatformAdapter {
  readonly id: PlatformId;
  readonly label: string;

  matches(url: URL): boolean;
  detectPlatform(url: URL): PlatformDetection;
  detectPageType(context: ExtractContext): PageType;
  identifyAccount(context: ExtractContext): AccountIdentity | null;
  discoverMedia(context: ExtractContext): AdapterDiscovery;
  extractMetadata(context: ExtractContext): MediaItem[];
  getDownloadOptions(item: MediaItem): DownloadOption[];
  extract(context: ExtractContext): ExtractResult;
}
```

`BasePlatformAdapter` (`src/adapters/base-adapter.ts`) implements the shared pipeline:

1. detect page type (fallback `unknown` on error);
2. identify the visible account (fallback `null` on error);
3. run platform-specific extraction inside a `try/catch`;
4. normalize and validate every item;
5. deduplicate by media id;
6. apply limitation severity (`blocking` ⇒ `restricted`, not downloadable);
7. infer formats and download options.

Extraction failure never throws across the content-script boundary; it returns an empty result with a warning limitation.

## Page type detection

| Platform | Supported detection |
| --- | --- |
| Instagram | Profile, feed, `/p/` post, reel, `/tv/` video, story, highlight, tagged, saved |
| Facebook | Profile/page, feed, post/photo, video/watch, reel, album, story, highlight, tagged, saved |
| TikTok | Profile, feed, video, photo post, story, tagged, favorites/saved; unknown for unsupported paths |

Detection lives in each adapter's `page-type.ts` and is unit-tested independently of DOM extraction.

## Account identification

`account.ts` per platform reads only page-visible evidence:

- Instagram: `og:title` `(@username)`, `twitter:creator`, or the article/profile header link.
- Facebook: article author link text/href, falling back to `og:title` with the site suffix removed. Numeric `profile.php` accounts may have a display name but no username — that is reported as absent rather than invented.
- TikTok: public embedded page data (`author.uniqueId` + `author.nickname`), then `og:title`, then a visible `/@` link.

All identities include `platform`, optional `username`, optional `displayName`, optional `profileUrl`, and `isPageOwner: false` unless known.

## Metadata normalization

`src/adapters/shared/metadata.ts` produces one stable shape without pretending platforms expose the same data:

| Field | Source / fallback |
| --- | --- |
| `platform` | Adapter id |
| `author` | Item author → account username → account display name |
| `account` | Normalized `AccountIdentity` when visible |
| `kind` | Platform extraction (image/video) |
| `url` | Direct `http(s)` media URL only |
| `thumbnailUrl` | Platform thumbnail/poster when present |
| `caption` | Platform caption/OG description when present |
| `publishedAt` | Platform embedded data, `article:published_time`, `datePublished`, `time[datetime]` |
| `postId` | URL/query parsing per platform |
| `sourcePageUrl` | Current page URL |
| `pageType` | Adapter page-type detection |
| `formats` | Platform-specific formats or a safe inferred source format |
| `downloadStatus` | `available`, `unsupported`, `restricted`, or `unknown` |
| `downloadable` | False for blob/adaptive media or blocking restrictions |

Missing values stay `undefined`; no placeholder account, date, or media URL is fabricated.

### Instagram specifics

- Profile pages add the visible profile picture (header/profile image or profile `og:image`).
- Profile/tagged/saved grid images carry their linked post URL and post id, so per-item actions can target the right post.
- Story/highlight pages use dialog/section/main selectors; only direct image/video URLs are offered.
- `in-page.ts` owns placement selectors for post action rows, grid anchors, and story/highlight containers.
- Grid images are the rendered grid asset, not guaranteed originals; a limitation states this.
- Login/private pages produce no in-page targets and blocking limitations.

### Facebook specifics

- URL variants cover `photo.php`/`photo`, `permalink.php`/`posts`, `watch/videos/video.php`, `reel(s)`, `media/set`, `album.php`, `profile.php`, `pages/people`, named pages, stories/highlights, and `sk=saved|tagged|album`.
- Albums collect only linked album photos; each carries its own `fbid` and absolute photo URL.
- Post dates come from `data-utime` (epoch seconds/ms) with meta fallback.
- `og:video` is accepted only when it looks like a direct media file or `fbcdn.net` media path. Page-only links are rejected.
- Embedded `hd_src`, `sd_src`, `playable_url`, and `browser_native_*` URLs become alternate MP4 formats when exposed.
- Blob/MSE playback is unsupported; no stream reconstruction is attempted.
- Profile/page media is limited to what is visible; login/private states are blocking limitations.

### TikTok specifics

- Public embedded data can yield the primary video plus multiple profile/feed items; only page data is read, never signed internal APIs or anti-bot endpoints.
- Each video gets playback MP4 first and a download-copy MP4 alternate when exposed.
- Cover images become separate downloadable thumbnail items when no slideshow images exist.
- Profile cards are parsed from visible anchors/posters: direct videos when embedded, otherwise link-only entries with a clear reason plus downloadable thumbnails.
- Private/login states and blob-only playback produce blocking/unsupported limitations; signed URLs are never rewritten.

### Stories and highlights

Adapters optionally implement:

```ts
discoverStories(context, discovery): StoryMedia[]
discoverHighlights(context, discovery): HighlightMedia[]
```

- Instagram/Facebook story pages produce `StoryMedia` items with 24-hour expiration when a timestamp is exposed; page text indicating expiry adds a `story-expired` limitation. Instagram profile story rings are surfaced as unavailable open-to-load entries. Highlight pages produce `HighlightMedia` with title, cover, and collection-tagged media. Profile highlight trays expose title/cover and require opening the highlight for media.
- TikTok stories are supported from public page data; TikTok highlights are explicitly unsupported.
- Highlight media/covers carry `collectionType: 'highlight'` and `collectionTitle`, so downloads land under `MediaVault/<platform>/highlights/<title>/`.
- No anonymous story viewing, view concealment, or private-account bypass is provided.

## Download options

`getDownloadOptions(item)` returns only formats with a direct, permitted `http(s)` URL.

| Platform | Typical options |
| --- | --- |
| Instagram | One source format (MP4 or JPG) inferred from the direct media URL |
| Facebook | Direct MP4/WebM or JPG; multiple MP4 alternates when embedded HD/SD sources exist; **none** for adaptive/blob or page-only video links |
| TikTok | Playback MP4 and, when the page exposes it, a separate download-copy MP4 |

Blocking restrictions, blob-only media, and invalid URLs return `[]`. The first option is marked `isDefault`.

## Resilience and access rules

- Every extraction runs through the base adapter's failure boundary.
- Selectors include multiple fallbacks and filter tiny UI images, avatars, sprites, and non-HTTP URLs.
- Signed URLs are never rewritten or guessed.
- Private accounts, login walls, stories/highlights that require access, and adaptive streams are reported as limitations.
- No cookies, tokens, credentials, or hidden APIs are read.
- The scanner deduplicates items and caps the result list.

## Tests

`tests/adapters/platform-detection.test.ts` covers platform ownership, subdomains, unsupported URLs, unknown paths, and every supported page type.

`tests/adapters/metadata.test.ts` covers account identity, post id/date, captions, thumbnails, source URL, formats, download status/options, blob-only media, login-wall restriction handling, slideshows, and an adapter that throws during extraction.
