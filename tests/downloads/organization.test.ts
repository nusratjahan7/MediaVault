import { describe, expect, it } from 'vitest';
import {
  buildFolderSegments,
  categoryForMedia,
} from '@/downloads/organization';
import type { MediaItem } from '@/types/media';

const POST: MediaItem = {
  id: 'instagram_post',
  platform: 'instagram',
  kind: 'image',
  url: 'https://example.com/post.jpg',
  author: 'Studio North',
  pageType: 'post',
  downloadable: true,
};

describe('folder organization', () => {
  it('derives folders without platform adapter dependencies', () => {
    expect(categoryForMedia(POST)).toBe('posts');
    expect(
      categoryForMedia({ ...POST, kind: 'video', pageType: 'reel' }),
    ).toBe('reels');
    expect(
      categoryForMedia({ ...POST, kind: 'video', pageType: 'video' }),
    ).toBe('videos');
    expect(categoryForMedia({ ...POST, pageType: 'story' })).toBe('stories');
    expect(
      categoryForMedia({
        ...POST,
        collectionType: 'highlight',
        collectionTitle: 'Travel',
      }),
    ).toBe('highlights');
  });

  it('adds optional account, category, and split folders', () => {
    expect(
      buildFolderSegments(
        {
          ...POST,
          author: 'Studio North',
          pageType: 'post',
          kind: 'image',
        },
        {
          organizeByAccount: true,
          organizeByCategory: true,
          splitByMediaType: true,
        },
      ),
    ).toEqual(['instagram', 'Studio North', 'posts', 'images']);
  });

  it('avoids redundant video split folders and organizes highlights by title', () => {
    const reels = buildFolderSegments(
      { ...POST, kind: 'video', pageType: 'reel' },
      {
        organizeByAccount: false,
        organizeByCategory: true,
        splitByMediaType: true,
      },
    );

    expect(reels).toEqual(['instagram', 'reels']);

    const highlight = buildFolderSegments(
      {
        ...POST,
        kind: 'video',
        pageType: 'highlight',
        collectionType: 'highlight',
        collectionTitle: '../Travel/2026',
      },
      {
        organizeByAccount: false,
        organizeByCategory: true,
        splitByMediaType: true,
      },
    );

    expect(highlight).toEqual([
      'instagram',
      'highlights',
      'Travel 2026',
      'videos',
    ]);
  });

  it('keeps highlight titles organized when category folders are disabled', () => {
    expect(
      buildFolderSegments(
        {
          ...POST,
          collectionType: 'highlight',
          collectionTitle: 'Travel',
        },
        {
          organizeByCategory: false,
        },
      ),
    ).toEqual(['instagram', 'highlights', 'Travel']);
  });

  it('sanitizes account and title traversal', () => {
    expect(
      buildFolderSegments(
        {
          ...POST,
          author: '../Secrets',
          collectionType: 'highlight',
          collectionTitle: '../../etc',
        },
        { organizeByAccount: true, organizeByCategory: true },
      ),
    ).toEqual(['instagram', 'Secrets', 'highlights', 'etc']);
  });
});
