# Saved Lists & Profile Workflow — Module 14

## Storage

Saved lists live in `chrome.storage.local` under `mediavault:saved-lists:v1` via `src/storage/lists.ts`.

```ts
interface SavedList {
  id;
  name;
  platform;
  accounts: SavedProfile[];
  createdAt;
  updatedAt;
}
```

Only these fields are stored per profile: platform, username, profile URL, optional display name, and timestamps. Passwords, cookies, tokens, emails, and messages are never read or stored.

## Accounts page

`accounts.html` now has two views:

- **Saved lists** (default): create/rename/delete lists, add/remove profiles, multi-select checkboxes, JSON import/export, and the profile workflow.
- **Interface preview**: the existing mock account picker is preserved separately.

Profiles are added manually by username and optional URL/display name. A missing URL is generated from the platform and username. Wrong-platform URLs and malformed usernames are rejected.

## Profile workflow

Selected profiles are stored in `chrome.storage.session` and opened **one at a time** in a tab.

- This is a manual download workflow: use the popup on each opened profile to scan and download visible media.
- MediaVault does not crawl profiles, auto-scroll, or bypass platform limits.
- The panel shows progress, allows reopening the current profile, advancing to the next, or stopping.

## JSON export/import

Export always asks for confirmation, then downloads a local JSON file containing list names, platforms, usernames, profile URLs, and optional display names. Import:

1. reads and validates the whole file **before** saving anything,
2. rejects malformed JSON, missing names/platforms/accounts, invalid usernames, wrong-platform URLs, duplicate list names in the file, or excessive counts,
3. shows a confirmation summary,
4. merges the validated lists into local storage with new IDs.

Accepted shapes: a single list object (the documented example), an array of lists, or an object with a `lists` array.

## Clearing

Privacy & data → **Clear saved lists** removes all lists and the active workflow after confirmation. **Reset everything** also clears lists, workflow, session selections, history, preview settings, and settings.

## Tests

`tests/storage/lists.test.ts` covers CRUD, stable IDs, duplicate rejection, URL/platform validation, credential non-storage, import validation, export, clearing, and the sequential workflow. `tests/components/saved-lists.test.tsx` covers the manager UI, import/export confirmation dialogs, and starting a workflow.
