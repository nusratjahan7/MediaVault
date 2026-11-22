# Stories & Highlights Manager — Module 10

## Models

`src/types/story.ts`

```ts
interface StoryMedia {
  id; platform; account;
  item: MediaItem;
  storyId?; postedAt?; expiresAt?;
  expired; available; unavailableReason?;
  sourcePageUrl;
}

interface HighlightMedia {
  id; platform; account;
  title;
  cover?: MediaItem;
  items: MediaItem[];
  sourcePageUrl;
  available; unavailableReason?;
}
```

Scan results now carry `stories` and `highlights` alongside the normal media items. Platform adapters implement optional `discoverStories()` / `discoverHighlights()` methods, keeping all platform selectors inside the adapter folder.

## Discovery

| Platform | Stories | Highlights |
| --- | --- | --- |
| Instagram | Story page media; 24h expiration when a timestamp is exposed; profile story rings surface as open-to-load entries | Highlight page media + cover; profile highlight tray links/covers |
| Facebook | Story page media; expiration when exposed | Highlight page media + cover; profile highlight links |
| TikTok | Story page media; expiration when exposed | Not supported through public page data — clearly marked unavailable |

Story timing uses item timestamps or page metadata plus a 24-hour TTL. If the platform exposes no timestamp, the UI says “Expiration unknown” instead of guessing. Expiry text on the page produces a `story-expired` limitation and unavailable media states.

## Manager interface

Open from:

- the **Stories** navigation item on full pages,
- the side-panel footer, or
- **Stories & highlights** in the popup on a story/highlight/profile page (passes the source tab id).

The page provides:

- privacy/authorization notice,
- per-account story groups with available counts,
- **Save story** per item and **Save all from account**,
- expiration labels,
- highlight cards with cover, title, and media count,
- **Save highlight**, **Save cover**, and **Open** actions,
- empty/error/permission states and a rescan action.

All downloads go through the shared `DownloadService` via typed messages. Skip Downloaded, concurrency, cancellation, retry, and progress apply normally.

## Highlight organization

Highlight media and covers are tagged with:

```ts
collectionType: 'highlight'
collectionTitle: '<title>'
```

`buildDownloadPath` writes them to:

```
MediaVault/<platform>/highlights/<safe-title>/<filename>
```

This applies to highlights saved from the manager and, because generic highlight-page items are tagged before the scan result is returned, also to popup downloads on that page.

## Expiration, deletion, and access

- Expired stories are shown with `Expired`, disabled Save, and a clear reason.
- Deleted/unavailable media yields an unavailable card, a limitation, or a scan empty state.
- Login/private/unavailable-account states are blocking; no content is fetched or bypassed.
- Profile story rings are surfaced as unavailable entries with “Open this story” guidance; media/expiration loads only after opening the story.
- Highlight trays on profiles expose title/cover and require opening the highlight to load its media.
- TikTok highlights are explicitly unavailable through permitted public data.
- Signed story/highlight URLs can expire before download; normal rescan/retry guidance applies.

## Privacy and viewing activity

- MediaVault only reads stories/highlights already visible in the user's current authorized session.
- **Anonymous story viewing is not supported.** MediaVault does not conceal or alter viewing activity; the platform may record views according to its own policies.
- No private-account, login, or privacy-control bypass is implemented.
- Stories/highlights are not persisted as a separate database; generated media metadata follows the normal local history/selection rules.

## Tests

- `tests/adapters/stories.test.ts` covers Instagram stories, expiration, highlight title/cover/media, profile highlight trays, title-based paths, and TikTok story discovery.
- `tests/components/stories-page.test.tsx` covers the manager UI, privacy messaging, expiration, story/highlight/cover actions, and queued story download.
- `tests/unit/story.test.ts` covers expiration formatting and account grouping.
