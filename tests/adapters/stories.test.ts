import { beforeEach, describe, expect, it } from 'vitest';
import { instagramAdapter } from '@/adapters/instagram';
import { buildDownloadPath } from '@/downloads/filename';
import { scanPage } from '@/content/scanner';
import { setDocumentHtml } from '../helpers/dom';
import storyHtml from '../fixtures/instagram/story.html?raw';
import highlightHtml from '../fixtures/instagram/highlight.html?raw';
import profileHighlightsHtml from '../fixtures/instagram/profile-highlights.html?raw';
import tiktokVideoHtml from '../fixtures/tiktok/video-with-thumbnail.html?raw';

function setStoryPublishedAt(date: Date): void {
  const meta = document.createElement('meta');
  meta.setAttribute('property', 'article:published_time');
  meta.setAttribute('content', date.toISOString());
  document.head.appendChild(meta);
}

beforeEach(() => {
  setDocumentHtml('');
});

describe('StoryMedia and HighlightMedia discovery', () => {
  it('builds accessible story media with expiration information', () => {
    setDocumentHtml(storyHtml);
    setStoryPublishedAt(new Date(Date.now() - 60 * 60 * 1000));

    const url = new URL('https://www.instagram.com/stories/studio.north/123/');
    const result = scanPage(document, url);

    expect(result.pageType).toBe('story');
    expect(result.stories).toHaveLength(2);

    const imageStory = result.stories?.find(
      (story) => story.item.kind === 'image',
    );
    expect(imageStory).toBeDefined();
    expect(imageStory?.platform).toBe('instagram');
    expect(imageStory?.account?.username).toBe('studio.north');
    expect(imageStory?.available).toBe(true);
    expect(imageStory?.expired).toBe(false);
    expect(imageStory?.expiresAt).toBeGreaterThan(Date.now());
    expect(imageStory?.storyId).toBe('123');

    const unsupported = result.stories?.find(
      (story) => story.item.kind === 'video',
    );
    expect(unsupported?.available).toBe(false);
    expect(unsupported?.unavailableReason).toBeDefined();
  });

  it('marks stories older than 24 hours as expired', () => {
    setDocumentHtml(storyHtml);
    setStoryPublishedAt(new Date(Date.now() - 48 * 60 * 60 * 1000));

    const result = scanPage(
      document,
      new URL('https://www.instagram.com/stories/studio.north/123/'),
    );
    const story = result.stories?.find((entry) => entry.item.kind === 'image');

    expect(story?.expired).toBe(true);
    expect(story?.available).toBe(false);
    expect(story?.unavailableReason).toMatch(/expired/i);
  });

  it('builds highlight media, cover, and title-based folders', () => {
    setDocumentHtml(highlightHtml);
    const url = new URL(
      'https://www.instagram.com/stories/highlights/17841400000000000/',
    );
    const result = scanPage(document, url);
    const highlight = result.highlights?.[0];

    expect(result.pageType).toBe('highlight');
    expect(highlight).toBeDefined();
    expect(highlight?.title).toBe('Travel');
    expect(highlight?.items).toHaveLength(1);
    expect(highlight?.available).toBe(true);
    expect(highlight?.cover?.url).toBe(
      'https://scontent.cdninstagram.com/v/t51/highlight-cover.jpg',
    );
    expect(highlight?.items[0]?.collectionType).toBe('highlight');
    expect(highlight?.items[0]?.collectionTitle).toBe('Travel');
    expect(highlight?.cover?.collectionTitle).toBe('Travel');
    expect(result.items[0]?.collectionType).toBe('highlight');
    expect(result.items[0]?.collectionTitle).toBe('Travel');

    const path = buildDownloadPath(highlight!.items[0]!, {
      downloadSubfolder: 'MediaVault',
      filenameTemplate: '{platform}-{author}-{id}',
    });
    expect(path).toMatch(/^MediaVault\/instagram\/highlights\/Travel\//);
  });

  it('discovers accessible profile highlights with covers and unavailable media state', () => {
    setDocumentHtml(profileHighlightsHtml);
    const url = new URL('https://www.instagram.com/studio.north/');
    const result = scanPage(document, url);
    const highlight = result.highlights?.[0];

    expect(result.pageType).toBe('profile');
    expect(highlight).toBeDefined();
    expect(highlight?.title).toBe('Travel');
    expect(highlight?.items).toHaveLength(0);
    expect(highlight?.cover?.url).toBe(
      'https://scontent.cdninstagram.com/v/t51/highlight-cover-small.jpg',
    );
    expect(highlight?.available).toBe(false);
    expect(highlight?.unavailableReason).toMatch(/Open this highlight/i);
    expect(highlight?.sourcePageUrl).toBe(
      'https://www.instagram.com/stories/highlights/777/',
    );

    expect(result.stories).toHaveLength(1);
    expect(result.stories?.[0]?.account?.username).toBe('studio.north');
    expect(result.stories?.[0]?.available).toBe(false);
    expect(result.stories?.[0]?.sourcePageUrl).toBe(
      'https://www.instagram.com/stories/studio.north/',
    );
    expect(result.stories?.[0]?.unavailableReason).toMatch(/Open this story/i);
    expect(result.stories?.[0]?.expiresAt).toBeUndefined();
  });

  it('builds TikTok story media from public embedded data', () => {
    setDocumentHtml(tiktokVideoHtml);

    const script = document.querySelector<HTMLScriptElement>(
      'script#__UNIVERSAL_DATA_FOR_REHYDRATION__',
    );
    const state = JSON.parse(script?.textContent ?? '{}') as {
      __DEFAULT_SCOPE__?: {
        'webapp.video-detail'?: {
          itemInfo?: { itemStruct?: { createTime?: number } };
        };
      };
    };
    const item =
      state.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
    if (item) {
      item.createTime = Math.floor(Date.now() / 1000) - 3600;
      script!.textContent = JSON.stringify(state);
    }

    const url = new URL('https://www.tiktok.com/@creator/story/7301');
    const result = scanPage(document, url);

    expect(result.pageType).toBe('story');
    expect(result.highlights).toEqual([]);
    expect(result.stories?.length).toBeGreaterThan(0);
    expect(
      result.stories?.some((story) => story.available && story.item.kind === 'video'),
    ).toBe(true);
  });

  it('keeps the Instagram adapter independent from other platforms’ story data', () => {
    setDocumentHtml(storyHtml);
    const result = instagramAdapter.discoverMedia({
      document,
      url: new URL('https://www.instagram.com/stories/studio.north/123/'),
    });
    expect(result.platform).toBe('instagram');
    expect(result.pageType).toBe('story');
  });
});
