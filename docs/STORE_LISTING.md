# Chrome Web Store Listing Draft — MediaVault 1.0.0

## Short description (≤132 chars)

Save media you’re authorized to access from Instagram, Facebook, and TikTok — locally, with privacy controls and no backend.

## Detailed description

MediaVault is a privacy-first media organizer for content you are already authorized to view.

- Save visible photos, videos, Reels, stories, highlights, thumbnails, and captions.
- Download single items or build a bulk queue with 1–3 concurrent downloads.
- Organize by platform, account, category, media type, and highlight title.
- Use safe filename templates with username, date, media ID, index, caption, location, platform, media type, and extension.
- Preserve original formats or convert supported images locally to JPG/PNG/WebP.
- Choose the highest legitimately exposed video source; no upscaling, transcoding, or stream merging is claimed.
- Save optional thumbnail, caption text, and source/publication metadata sidecars.
- Monitor active/completed/failed/cancelled downloads in a dashboard.
- Manage local saved profiles and export/import lists as JSON.
- Export visible or officially imported follower/following data as CSV/JSON with filtering and field selection.
- Clear history, lists, remembered download IDs, or all local extension data.
- Use a permission overview and an honest Ghost Mode section that does not claim anonymity.

MediaVault does not bypass private accounts, authentication, DRM, rate limits, story view tracking, or DM read receipts. No cookies, tokens, passwords, or private messages are read. Nothing is uploaded to a MediaVault server; the extension has no backend.

## Single purpose

Save and organize media the user is authorized to access from supported social platforms, entirely on the user's device.

## Permissions justification

- **storage** — persist local preferences, history, saved lists, and selections.
- **downloads** — save files and monitor Chrome-confirmed progress.
- **downloads.open** — open a completed file from the dashboard after a user click.
- **notifications** — optional completion/failure notices; off by default.
- **scripting + activeTab** — inject the scanner only after the user enables a site.
- **sidePanel** — local library/queue UI.
- **Optional host access** — per-platform page access only after explicit consent; optional CDN access only for local image conversion.
- **No** cookies, webRequest, tabs, history, management, or host permissions at install.

## Category / audience

Productivity / tools. Intended for adults saving content they own or have permission to save.

## Privacy

See `PRIVACY.md` and `docs/PRIVACY_POLICY_DRAFT.md`. No analytics, telemetry, cloud sync, proxies, remote code, or third-party data sale.

## Known limitations to disclose

- Platform DOM changes can break extraction.
- Signed CDN URLs expire.
- Blob/MSE/DASH streams are not reconstructed.
- Story/highlight and relationship availability is controlled by the platform.
- Ghost Mode is local trace reduction only and is not anonymity.
- Live Chrome E2E on real platform pages must be completed before submission.

## Assets needed before submission

- 1280×800 or 640×400 screenshots of popup, dashboard, settings, and privacy pages.
- 440×280 small promo tile.
- 1400×560 marquee promo tile.
- Store privacy questionnaire matching `PRIVACY.md`.

## Support

Use the repository issue tracker. Never include cookies, tokens, private messages, or media URLs in reports.
