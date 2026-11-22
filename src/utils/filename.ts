import { MAX_FILENAME_LENGTH } from '@/constants';

const INVALID_FILENAME_CHARS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);
const RESERVED_WINDOWS_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

const KNOWN_TOKENS = new Set([
  'platform',
  'author',
  'username',
  'id',
  'mediaid',
  'postid',
  'index',
  'caption',
  'location',
  'date',
  'kind',
  'mediatype',
  'ext',
]);
const TOKEN_PATTERN = /\{([a-zA-Z]+)\}/g;

export interface FilenameToken {
  token: string;
  label: string;
  description: string;
  sample: string;
}

export const FILENAME_TOKENS: FilenameToken[] = [
  {
    token: '{username}',
    label: 'Username',
    description: 'Visible account username',
    sample: 'studio',
  },
  {
    token: '{date}',
    label: 'Date',
    description: 'Publication date when known, otherwise download date',
    sample: '2026-11-22',
  },
  {
    token: '{mediaId}',
    label: 'Media ID',
    description: 'Platform post/media ID when exposed',
    sample: 'C8xY2aPq',
  },
  {
    token: '{index}',
    label: 'Index',
    description: 'Position in the current download batch',
    sample: '2',
  },
  {
    token: '{caption}',
    label: 'Caption',
    description: 'Shortened, filesystem-safe caption',
    sample: ' studio update ',
  },
  {
    token: '{location}',
    label: 'Location',
    description: 'Location metadata when the page exposes it',
    sample: 'Lisbon',
  },
  {
    token: '{platform}',
    label: 'Platform',
    description: 'instagram, facebook, or tiktok',
    sample: 'instagram',
  },
  {
    token: '{mediaType}',
    label: 'Media type',
    description: 'image or video',
    sample: 'video',
  },
  {
    token: '{ext}',
    label: 'Extension',
    description: 'Actual output extension',
    sample: 'mp4',
  },
];

export interface FilenameTemplateContext {
  platform: string;
  author?: string;
  mediaId?: string;
  index?: number;
  caption?: string;
  location?: string;
  id: string;
  kind: string;
  mediaType?: string;
  ext: string;
  date: Date;
}

function stripInvalidCharacters(input: string): string {
  let result = '';

  for (const character of input) {
    const code = character.codePointAt(0) ?? 0;
    result +=
      INVALID_FILENAME_CHARS.has(character) || code < 32 || code === 127 ? ' ' : character;
  }

  return result;
}

export function sanitizeFilename(input: string, maxLength = MAX_FILENAME_LENGTH): string {
  const effectiveMax = Math.max(1, maxLength);
  let value = stripInvalidCharacters(input.normalize('NFKC'))
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\s]+|[.\s]+$/g, '');

  if (value.length > effectiveMax) {
    value = value.slice(0, effectiveMax).replace(/[.\s]+$/g, '');
  }

  const stem = (value.split('.')[0] ?? '').toLowerCase();
  if (RESERVED_WINDOWS_NAMES.has(stem)) {
    value = `_${value}`;
  }

  return value || 'media';
}

function optionalToken(value: string | undefined, maxLength: number): string {
  const trimmed = value?.trim();
  return trimmed ? sanitizeFilename(trimmed, maxLength) : '';
}

export function sanitizeSubfolder(input: string): string {
  const segments = input
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
    .map((segment) => sanitizeFilename(segment, 40));

  return segments.length > 0 ? segments.join('/') : 'MediaVault';
}

function dateToken(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function renderFilenameTemplate(template: string, context: FilenameTemplateContext): string {
  const username = sanitizeFilename(context.author?.trim() || 'unknown', 40);
  const id = sanitizeFilename(context.id, 60);
  const mediaId = optionalToken(context.mediaId, 60) || id;
  const mediaType = context.mediaType ?? context.kind;
  const extension = context.ext.replace(/^\./, '').toLowerCase();

  const values: Record<string, string> = {
    platform: sanitizeFilename(context.platform, 20),
    author: username,
    username,
    id,
    mediaid: mediaId,
    postid: mediaId,
    index: String(context.index && context.index > 0 ? context.index : 1),
    caption: optionalToken(context.caption, 60),
    location: optionalToken(context.location, 40),
    date: dateToken(context.date),
    kind: sanitizeFilename(context.kind, 20),
    mediatype: sanitizeFilename(mediaType, 20),
    ext: sanitizeFilename(context.ext, 10),
  };

  const replaced = template.replace(TOKEN_PATTERN, (_match, rawToken: string) => {
    const token = rawToken.toLowerCase();
    return KNOWN_TOKENS.has(token) ? (values[token] ?? '') : '';
  });

  const maxBody = Math.max(24, MAX_FILENAME_LENGTH - extension.length - 1);
  return sanitizeFilename(replaced, maxBody);
}

export function ensureFileExtension(name: string, extension: string): string {
  const suffix = `.${extension.toLowerCase().replace(/^\./, '')}`;
  if (name.toLowerCase().endsWith(suffix)) {
    return name;
  }

  const maxBody = Math.max(1, MAX_FILENAME_LENGTH - suffix.length);
  const trimmed = name
    .replace(/[.\s]+$/g, '')
    .slice(0, maxBody)
    .replace(/[.\s]+$/g, '');

  return `${trimmed || 'media'}${suffix}`;
}

export function stripFileExtension(path: string): string {
  return path.replace(/\.[^./\\]+$/, '');
}

export function sidecarFilename(
  mainFilename: string,
  label: 'caption' | 'metadata' | 'thumbnail',
  extension: string,
): string {
  const normalized = mainFilename.replace(/\\/g, '/');
  const slash = normalized.lastIndexOf('/');
  const directory = slash >= 0 ? normalized.slice(0, slash + 1) : '';
  const suffix = `.${label}.${extension.replace(/^\./, '')}`;
  const base = stripFileExtension(
    slash >= 0 ? normalized.slice(slash + 1) : normalized,
  )
    .slice(0, Math.max(1, MAX_FILENAME_LENGTH - suffix.length))
    .replace(/[.\s]+$/g, '');

  return `${directory}${base || 'media'}${suffix}`;
}

export function sanitizeDownloadPath(path: string, fallback = 'MediaVault/media'): string {
  const segments = path
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .map((segment) => sanitizeFilename(segment, 120));

  return segments.length > 0 ? segments.join('/') : fallback;
}
