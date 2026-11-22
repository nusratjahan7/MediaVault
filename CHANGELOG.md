# Changelog

## 1.0.0 — 2026-11-22

### Core
- Manifest V3 Chrome extension for saving authorized Instagram, Facebook, and TikTok media.
- React 19, strict TypeScript, Vite, Tailwind, Chrome storage, IndexedDB, Downloads API.
- Popup, side panel, options, history, dashboard, stories, accounts, relationship export, and privacy surfaces.
- Typed background messaging with sender/id and payload validation, centralized error handling, and package verification.

### Media and downloads
- Platform adapters with page/account detection, resilient extraction, metadata normalization, and limitations.
- Single and bulk downloads through Chrome Downloads with Chrome-confirmed completion, byte-based progress, pause/resume, cancel, retry, dedupe, and Skip Downloaded.
- Stories/highlights manager, highlight covers, expiration states, and manual profile workflows.
- Folder organization: account/category/media-type/highlight-title folders; safe filename templates, saved templates, preview, and reset.
- Format preferences: original/JPG/PNG/WebP local image conversion, highest exposed video source, thumbnail/caption/metadata sidecars, and actual output reporting.
- Advanced settings: new-media memory, automatic retries, bulk confirmation, notifications, automatic history clearing, concurrency, and Save As.
- Download dashboard with counts, known sizes, queue progress, per-file status/errors, retry/cancel/open, and completed-entry clearing.

### Privacy and release
- Saved lists with strict JSON import/export validation and confirmation dialogs.
- Relationship CSV/JSON export from visible rows or official data exports, with filtering and field selection.
- Privacy status, permission overview, data clearing, and honest Ghost Mode limitations.
- Explicit self-only CSP, security audit script, manifest permission allowlist, and security audit report.
- Production build, ZIP, installation instructions, store listing draft, and privacy policy draft.

### Verification
- TypeScript, ESLint, automated unit/integration tests, production build, manifest/package verification, and security audit.
- Live Chrome E2E against real platform pages remains environment-dependent; see the release report.
