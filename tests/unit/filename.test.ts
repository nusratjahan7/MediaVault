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

  it('renders username, media ID, index, caption, location, media type, and source tokens', () => {
    expect(
      renderFilenameTemplate(
        '{platform}-{username}-{mediaId}-{index}-{mediaType}-{caption}-{location}',
        {
          platform: 'instagram',
          author: 'studio',
          id: 'internal-id',
          mediaId: 'C8xY2aPq',
          index: 3,
          caption: 'Sunset / beach',
          location: 'Lisbon',
          mediaType: 'video',
          kind: 'video',
          ext: 'mp4',
          date: DATE,
        },
      ),
    ).toBe('instagram-studio-C8xY2aPq-3-video-Sunset beach-Lisbon');
  });

  it('keeps empty optional tokens out of the filename', () => {
    expect(
      renderFilenameTemplate('{username}-{caption}-{location}', {
        platform: 'tiktok',
        author: 'creator',
        id: '1',
        kind: 'image',
        ext: 'jpg',
        date: DATE,
      }),
    ).toBe('creator--');
  });

  it('caps long rendered names so the extension fits', () => {
    const rendered = renderFilenameTemplate('{caption}', {
      platform: 'tiktok',
      author: 'creator',
      caption: 'x'.repeat(400),
      id: '1',
      kind: 'image',
      ext: 'webp',
      date: DATE,
    });

    expect(rendered.length).toBeLessThanOrEqual(115);
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

  it('adds account, category, and media-type folders', () => {
    expect(
      buildDownloadPath(
        {
          ...item,
          kind: 'image',
          url: 'https://scontent.cdninstagram.com/v/photo.jpg',
          pageType: 'post',
          postId: 'ABC123',
          caption: 'Hello',
          location: 'Lisbon',
        },
        {
          downloadSubfolder: 'MediaVault',
          filenameTemplate: '{username}-{mediaId}-{index}-{caption}',
          organizeByAccount: true,
          organizeByCategory: true,
          splitByMediaType: true,
        },
      ),
    ).toBe(
      'MediaVault/instagram/studio/posts/images/studio-ABC123-1-Hello.jpg',
    );
  });

  it('uses highlight title folders and the output extension', () => {
    const { outputExtension: _unused, ...highlight } = {
      ...item,
      kind: 'image' as const,
      pageType: 'highlight' as const,
      collectionType: 'highlight' as const,
      collectionTitle: 'Travel 2026',
      outputExtension: 'webp',
    };
    void _unused;

    expect(
      buildDownloadPath(
        { ...highlight, outputExtension: 'webp' },
        {
          downloadSubfolder: 'MediaVault',
          filenameTemplate: '{id}',
          organizeByCategory: true,
        },
      ),
    ).toBe('MediaVault/instagram/highlights/Travel 2026/abc12345.webp');
  });

  it('uses publication dates and indexes for tokens', () => {
    expect(
      buildDownloadPath(
        {
          ...item,
          index: 4,
          publishedAt: Date.UTC(2025, 0, 2),
        },
        {
          downloadSubfolder: 'MediaVault',
          filenameTemplate: '{date}-{index}-{mediaType}',
          organizeByCategory: false,
        },
      ),
    ).toBe('MediaVault/instagram/2025-01-02-4-video.mp4');
  });
});
