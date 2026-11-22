import type { PlatformId } from '@/types/platform';
import type {
  RelationshipEntry,
  RelationshipKind,
} from '@/types/relationship';
import { AppError } from '@/utils/errors';
import {
  defaultProfileUrl,
  normalizeProfileUsername,
  parseProfileUrlForPlatform,
  PROFILE_USERNAME_PATTERN,
} from '@/utils/profile';

const MAX_RELATIONSHIP_IMPORT_ROWS = 5_000;

export interface RelationshipImportOptions {
  platform: PlatformId;
  kind: RelationshipKind;
  fileName?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function usernameFromProfileUrl(
  platform: PlatformId,
  raw: string,
): string | undefined {
  try {
    const parsed = new URL(raw);
    if (platform === 'tiktok') {
      return /^\/@([^/]+)/.exec(parsed.pathname)?.[1];
    }

    if (parsed.pathname === '/profile.php') {
      return parsed.searchParams.get('id') ?? undefined;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments[0];
  } catch {
    return undefined;
  }
}

function normalizeEntry(
  platform: PlatformId,
  input: {
    username?: string;
    profileUrl?: string;
    displayName?: string;
  },
): RelationshipEntry | null {
  const fromUrl = input.profileUrl
    ? usernameFromProfileUrl(platform, input.profileUrl)
    : undefined;
  const username = normalizeProfileUsername(input.username ?? fromUrl ?? '');

  if (!PROFILE_USERNAME_PATTERN.test(username)) {
    return null;
  }

  const parsedUrl = input.profileUrl
    ? parseProfileUrlForPlatform(platform, input.profileUrl)
    : null;
  const displayName =
    input.displayName &&
    input.displayName.trim() &&
    input.displayName.trim().toLowerCase() !== username.toLowerCase()
      ? input.displayName.trim().slice(0, 80)
      : undefined;

  return {
    username,
    profileUrl: parsedUrl ?? defaultProfileUrl(platform, username),
    ...(displayName ? { displayName } : {}),
  };
}

function dedupe(entries: RelationshipEntry[]): RelationshipEntry[] {
  const seen = new Set<string>();
  const result: RelationshipEntry[] = [];

  for (const entry of entries) {
    const key = (entry.profileUrl ?? entry.username).toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
    if (result.length >= MAX_RELATIONSHIP_IMPORT_ROWS) {
      break;
    }
  }

  return result;
}

function stringListEntry(record: Record<string, unknown>): {
  username?: string;
  profileUrl?: string;
  displayName?: string;
} {
  const stringList = Array.isArray(record.string_list_data)
    ? record.string_list_data[0]
    : undefined;
  const stringListRecord = isRecord(stringList) ? stringList : {};
  const stringMap = isRecord(record.string_map_data)
    ? record.string_map_data
    : {};
  const mapUsername = isRecord(stringMap.Username) ? stringMap.Username.value : undefined;
  const mapProfileUrl = isRecord(stringMap['Profile Url'])
    ? stringMap['Profile Url'].value
    : undefined;

  return {
    username: firstString(
      record.username,
      record.user_name,
      record.handle,
      mapUsername,
      stringListRecord.value,
      record.value,
      record.title,
    ),
    profileUrl: firstString(
      record.profileUrl,
      record.profile_url,
      record.url,
      record.href,
      mapProfileUrl,
      stringListRecord.href,
    ),
    displayName: firstString(
      record.displayName,
      record.display_name,
      record.full_name,
      record.name,
      record.title,
    ),
  };
}

function collectJsonEntries(
  value: unknown,
  platform: PlatformId,
  kind: RelationshipKind,
  entries: RelationshipEntry[],
  parentKey = '',
  seenArrays = new WeakSet<object>(),
): void {
  if (Array.isArray(value)) {
    if (seenArrays.has(value)) {
      return;
    }
    seenArrays.add(value);

    const key = parentKey.toLowerCase();
    const otherKind = kind === 'followers' ? 'following' : 'followers';
    const keyMatches = key.includes(kind);
    const explicitlyOtherKind = key.includes(otherKind) && !keyMatches;

    if (explicitlyOtherKind) {
      return;
    }

    for (const item of value) {
      if (!isRecord(item)) {
        continue;
      }

      const extracted = stringListEntry(item);
      if (
        keyMatches ||
        extracted.username ||
        extracted.profileUrl ||
        'string_list_data' in item
      ) {
        const normalized = normalizeEntry(platform, extracted);
        if (normalized) {
          entries.push(normalized);
        }
      } else {
        collectJsonEntries(item, platform, kind, entries, parentKey, seenArrays);
      }
    }
    return;
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectJsonEntries(child, platform, kind, entries, key, seenArrays);
    }
  }
}

function parseJson(
  text: string,
  platform: PlatformId,
  kind: RelationshipKind,
): RelationshipEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new AppError('INVALID_INPUT', 'The selected file is not valid JSON.');
  }

  const entries: RelationshipEntry[] = [];
  collectJsonEntries(parsed, platform, kind, entries);
  return dedupe(entries);
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((candidate) =>
    candidate.some((value) => value.trim().length > 0),
  );
}

const USERNAME_HEADERS = new Set(['username', 'user name', 'handle', 'account', 'value']);
const URL_HEADERS = new Set([
  'profileurl',
  'profile url',
  'profile link',
  'url',
  'href',
  'link',
]);
const NAME_HEADERS = new Set(['displayname', 'display name', 'name', 'full name', 'title']);

function headerIndex(
  headers: string[],
  aliases: Set<string>,
): number {
  return headers.findIndex((header) =>
    aliases.has(header.trim().toLowerCase().replace(/_/g, ' ')),
  );
}

function parseCsv(
  text: string,
  platform: PlatformId,
): RelationshipEntry[] {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0]!.map((header) => header.trim().toLowerCase());
  const usernameIndex = headerIndex(headers, USERNAME_HEADERS);
  const urlIndex = headerIndex(headers, URL_HEADERS);
  const nameIndex = headerIndex(headers, NAME_HEADERS);
  const hasHeader = usernameIndex >= 0 || urlIndex >= 0 || nameIndex >= 0;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const entries: RelationshipEntry[] = [];

  for (const row of dataRows) {
    const username =
      (usernameIndex >= 0 ? row[usernameIndex] : row[0])?.trim() ?? '';
    const profileUrl =
      (urlIndex >= 0 ? row[urlIndex] : row[1])?.trim() ?? undefined;
    const displayName =
      (nameIndex >= 0 ? row[nameIndex] : row[2])?.trim() ?? undefined;

    const normalized = normalizeEntry(platform, {
      ...(username ? { username } : {}),
      ...(profileUrl ? { profileUrl } : {}),
      ...(displayName ? { displayName } : {}),
    });

    if (normalized) {
      entries.push(normalized);
    }
  }

  return dedupe(entries);
}

export function parseRelationshipImport(
  text: string,
  options: RelationshipImportOptions,
): RelationshipEntry[] {
  if (!text.trim()) {
    throw new AppError('INVALID_INPUT', 'The selected file is empty.');
  }

  const looksLikeJson =
    options.fileName?.toLowerCase().endsWith('.json') ||
    /^[\s\uFEFF]*(?:\{|\[)/.test(text);
  const entries = looksLikeJson
    ? parseJson(text, options.platform, options.kind)
    : parseCsv(text, options.platform);

  if (entries.length === 0) {
    throw new AppError(
      'INVALID_INPUT',
      `No ${options.kind} rows with usernames were found in the selected file.`,
    );
  }

  return entries;
}
