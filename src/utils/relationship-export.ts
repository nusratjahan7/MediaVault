import type { RelationshipEntry } from '@/types/relationship';

export type RelationshipField = 'username' | 'profileUrl' | 'displayName';

export const RELATIONSHIP_FIELDS: Array<{
  id: RelationshipField;
  label: string;
}> = [
  { id: 'username', label: 'Username' },
  { id: 'profileUrl', label: 'Profile URL' },
  { id: 'displayName', label: 'Display name' },
];

export interface RelationshipExportRow {
  username: string;
  profileUrl?: string;
  displayName?: string;
}

export function filterRelationships(
  entries: RelationshipEntry[],
  query: string,
): RelationshipEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return entries;
  }

  return entries.filter((entry) =>
    [entry.username, entry.profileUrl, entry.displayName]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(needle)),
  );
}

export function buildRelationshipRows(
  entries: RelationshipEntry[],
  fields: RelationshipField[],
): RelationshipExportRow[] {
  const selected = new Set(fields);

  return entries.map((entry) => ({
    username: selected.has('username') ? entry.username : '',
    ...(selected.has('profileUrl') && entry.profileUrl
      ? { profileUrl: entry.profileUrl }
      : {}),
    ...(selected.has('displayName') && entry.displayName
      ? { displayName: entry.displayName }
      : {}),
  }));
}

function csvCell(value: string | undefined): string {
  const text = value ?? '';
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function relationshipsToCsv(
  entries: RelationshipEntry[],
  fields: RelationshipField[],
): string {
  const rows = buildRelationshipRows(entries, fields).filter(
    (row) => row.username || row.profileUrl || row.displayName,
  );
  const header = fields.join(',');
  const lines = rows.map((row) =>
    fields.map((field) => csvCell(row[field])).join(','),
  );

  return [header, ...lines].join('\r\n');
}

export function relationshipsToJson(
  entries: RelationshipEntry[],
  fields: RelationshipField[],
): string {
  const rows = buildRelationshipRows(entries, fields).filter(
    (row) => row.username || row.profileUrl || row.displayName,
  );

  return JSON.stringify(rows, null, 2);
}
