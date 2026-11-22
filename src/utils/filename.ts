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

const KNOWN_TOKENS = new Set(['platform', 'author', 'id', 'date', 'kind', 'ext']);
const TOKEN_PATTERN = /\{([a-zA-Z]+)\}/g;

export interface FilenameTemplateContext {
  platform: string;
  author?: string;
  id: string;
  kind: string;
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
  let value = stripInvalidCharacters(input.normalize('NFKC'))
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/^[.\s]+|[.\s]+$/g, '');

  if (value.length > maxLength) {
    value = value.slice(0, maxLength).replace(/[.\s]+$/g, '');
  }

  const stem = (value.split('.')[0] ?? '').toLowerCase();
  if (RESERVED_WINDOWS_NAMES.has(stem)) {
    value = `_${value}`;
  }

  return value || 'media';
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
  const values: Record<string, string> = {
    platform: context.platform,
    author: sanitizeFilename(context.author?.trim() || 'unknown', 40),
    id: context.id,
    date: dateToken(context.date),
    kind: context.kind,
    ext: context.ext,
  };

  const replaced = template.replace(TOKEN_PATTERN, (_match, rawToken: string) => {
    const token = rawToken.toLowerCase();
    return KNOWN_TOKENS.has(token) ? (values[token] ?? '') : '';
  });

  return sanitizeFilename(replaced);
}

export function ensureFileExtension(name: string, extension: string): string {
  const suffix = `.${extension.toLowerCase().replace(/^\./, '')}`;
  if (name.toLowerCase().endsWith(suffix)) {
    return name;
  }

  return `${name.replace(/[.\s]+$/g, '')}${suffix}`;
}
