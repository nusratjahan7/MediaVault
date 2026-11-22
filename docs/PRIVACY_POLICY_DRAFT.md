# MediaVault Privacy Policy (Draft)

Effective date: 2026-11-22

MediaVault is a local-first Chrome extension. It does not operate a backend, cloud account, analytics service, advertising service, or data broker.

## Data we collect

MediaVault does not collect or transmit personal data to the developer. It stores the following locally in the user's Chrome profile:

- settings and enabled-site preferences;
- local download history, filenames, status, media/thumbnail URLs, sizes, errors, and output notes;
- saved-list names, platforms, usernames, profile URLs, and optional display names;
- remembered media-ID fingerprints used by “Download new media only”;
- session-only bulk selection and profile workflow data;
- mock preview account IDs when the user enables the interface preview.

MediaVault does not intentionally store passwords, cookies, authentication tokens, private messages, emails, or payment data.

## Network activity

- The extension reads the current page only after the user enables that site.
- Downloads use Chrome's Downloads API against direct platform media URLs.
- Thumbnails load directly from platform CDNs.
- Optional image conversion fetches the selected image from supported CDNs with `credentials: 'omit'`; the image is converted locally and never uploaded.
- Official privacy/data-export links open normal browser pages when clicked.
- No MediaVault server receives media, lists, history, or relationship data.

## Permissions

`storage` (local state), `downloads`/`downloads.open` (save/open files), `notifications` (optional notices), `scripting`/`activeTab` (scan the enabled page), `sidePanel` (library). Optional host access is requested only when needed and is revocable.

## User controls

Users can clear history, saved lists, remembered media IDs, and all local extension data in Settings → Privacy & data, revoke site access, disable notifications, and delete individual history/list entries. Uninstalling removes extension storage according to Chrome behavior. Downloaded files remain on disk until the user deletes them.

## Sharing

MediaVault does not sell, rent, transmit, or share user data. Relationship/list exports are generated locally and saved only when the user clicks export.

## Ghost Mode / anonymity

Ghost Mode is limited to reducing local traces. MediaVault does not hide story views, DM read receipts, identity, or authentication and does not bypass platform privacy controls. Platform activity is governed by the platform's own policy.

## Children

MediaVault is not directed to children under 13 and does not knowingly collect children's data.

## Changes

Material changes will be documented in the repository and extension changelog. This draft should be reviewed for legal/compliance requirements before store publication.

## Contact

Use the repository issue tracker. Do not include personal data, cookies, tokens, or private media URLs.
