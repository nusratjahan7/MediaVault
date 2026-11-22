# Account Relationship Export — Module 15

## Sources

MediaVault supports two authorized sources:

1. **Visible page rows** on a followers/following page the user has opened. Platform adapters read only currently rendered profile links inside the dialog/main content. There is no background crawling, automatic scrolling, private API, or access-control bypass.
2. **Official platform data export** chosen by the user. JSON and CSV are parsed locally, with only username, profile URL, and display name retained.

## Export

- Select **Visible page** or **Official export file**.
- For imports, choose the platform and whether the file is a followers or following list.
- Filter by username/profile URL/display name.
- Choose which fields to include: username, profile URL, display name.
- Choose CSV or JSON, review the confirmation summary, and download.

CSV values are escaped; JSON contains only the selected fields. Files are generated locally via a Blob URL and never uploaded.

## Import details

Official exports vary. The importer understands common Instagram-style `string_list_data` records, generic username/url/name records, and CSV headers such as `Username`, `Profile URL`, and `Display Name`. It enforces the selected list kind: a following export is not silently mixed into a followers export. Unknown/private fields are ignored.

Unsupported or empty files are rejected with a clear message.

## Privacy boundaries

- Only rows already visible in the user's authorized session or a file the user chooses are used.
- No cookies, tokens, private messages, hidden followers, or restricted personal data are accessed.
- No automatic scrolling or platform API scraping is implemented.
- Nothing is uploaded.
- Exported lists are not persisted by the relationship page; only the generated file remains on disk.

## Platform limitations

- Visible-page exports include only rendered rows; users can scroll and rescan.
- Some relationship pages/export formats may not expose all fields or may change their DOM.
- Official data export availability and contents are controlled by each platform.
- MediaVault does not claim to export hidden/private relationships.

## Official data export links

- Instagram Accounts Center — Download your information
- Facebook — Download Your Information
- TikTok — Download your data

Links are shown on the export page.

## Tests

`tests/adapters/relationships.test.ts` covers visible-row discovery; `tests/unit/relationship-export.test.ts` covers JSON/CSV imports, malformed data rejection, kind isolation, filtering, field selection, and CSV escaping; `tests/components/relationships-page.test.tsx` covers page scanning, filtering, field selection, export confirmation, and local import.
