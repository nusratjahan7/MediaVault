import { describe, expect, it } from 'vitest';
import { buildDownloadPath } from '@/downloads/filename';
import type { MediaItem } from '@/types/media';
import {
  ensureFileExtension,
  renderFilenameTemplate,
  sanitizeFilename,
  sanitizeSubfolder,
} from '@/utils/filename';

const DATE = new Date(2025, 0, 2);

describe('sanitizeFilename', () => {
  it('removes path separators and illegal characters', () => {
    expect(sanitizeFilename('../etc/passwd')).toBe('etc passwd');
    expect(sanitizeFilename('a<b>c:d"e/f\\g|h?i*j')).toBe('a b c d e f g h i j');
  });

  it('strips trailing dots and spaces', () => {
    expect(sanitizeFilename('  name.  ')).toBe('name');
  });

  it('prefixes reserved Windows names', () => {
    expect(sanitizeFilename('CON')).toBe('_CON');
    expect(sanitizeFilename('con.txt')).toBe('_con.txt');
  });

  it('falls back when nothing remains', () => {
    expect(sanitizeFilename('...')).toBe('media');
  });
});

describe('sanitizeSubfolder', () => {
  it('removes traversal segments', () => {
    expect(sanitizeSubfolder('../../')).toBe('MediaVault');
    expect(sanitizeSubfolder('MediaVault/../Secrets')).toBe('MediaVault/Secrets');
  });

  it('keeps safe nested folders', () => {
    expect(sanitizeSubfolder('MediaVault/Instagram')).toBe('MediaVault/Instagram');
  });
});

describe('renderFilenameTemplate', () => {
  it('renders known tokens and a date', () => {
    expect(
      renderFilenameTemplate('{platform}-{author}-{date}-{kind}', {
        platform: 'instagram',
        author: 'Studio',
        id: 'abc',
        kind: 'video',
        ext: 'mp4',
        date: DATE,
      }),
    ).toBe('instagram-Studio-2025-01-02-video');
  });

  it('falls back to unknown when no author exists', () => {
    expect(
      renderFilenameTemplate('{author}', {
        platform: 'tiktok',
        id: 'abc',
        kind: 'video',
        ext: 'mp4',
        date: DATE,
      }),
    ).toBe('unknown');
  });

  it('strips unknown tokens', () => {
    expect(
      renderFilenameTemplate('{platform}{nope}{id}', {
        platform: 'facebook',
        author: 'A',
        id: '1234',
        kind: 'image',
        ext: 'jpg',
        date: DATE,
      }),
    ).toBe('facebook1234');
  });
});

describe('ensureFileExtension', () => {
  it('adds the extension when missing', () => {
    expect(ensureFileExtension('clip', 'mp4')).toBe('clip.mp4');
  });

  it('does not duplicate an existing extension', () => {
    expect(ensureFileExtension('clip.MP4', 'mp4')).toBe('clip.MP4');
  });
});

describe('buildDownloadPath', () => {
  const item: MediaItem = {
    id: 'instagram_abc12345',
    platform: 'instagram',
    kind: 'video',
    url: 'https://scontent.cdninstagram.com/v/clip.mp4',
    author: 'studio',
    downloadable: true,
  };

  it('builds a platform subfolder path with a safe filename', () => {
    expect(
      buildDownloadPath(item, {
        downloadSubfolder: 'MediaVault',
        filenameTemplate: '{platform}-{author}-{id}',
      }),
    ).toBe('MediaVault/instagram/instagram-studio-abc12345.mp4');
  });

  it('sanitizes a hostile subfolder', () => {
    expect(
      buildDownloadPath(item, {
        downloadSubfolder: '../../MediaVault',
        filenameTemplate: '{id}',
      }),
    ).toBe('MediaVault/instagram/abc12345.mp4');
  });

  it('infers an extension when the URL has none', () => {
    const image: MediaItem = {
      ...item,
      id: 'instagram_deadbeef',
      kind: 'image',
      url: 'https://scontent.cdninstagram.com/v/photo?x=1',
    };

    expect(
      buildDownloadPath(image, {
        downloadSubfolder: 'MediaVault',
        filenameTemplate: '{id}',
      }),
    ).toBe('MediaVault/instagram/deadbeef.jpg');
  });
});
