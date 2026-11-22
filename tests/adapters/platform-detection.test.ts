import { beforeEach, describe, expect, it } from 'vitest';
import {
  facebookAdapter,
  getAdapterForUrl,
  instagramAdapter,
  tiktokAdapter,
} from '@/adapters';
import type { PlatformAdapter } from '@/adapters/types';
import type { PageType } from '@/types/page';
import { setDocumentHtml } from '../helpers/dom';

interface PageCase {
  url: string;
  pageType: PageType;
}

const INSTAGRAM_CASES: PageCase[] = [
  { url: 'https://www.instagram.com/studio.north/', pageType: 'profile' },
  { url: 'https://www.instagram.com/', pageType: 'feed' },
  { url: 'https://www.instagram.com/explore/', pageType: 'feed' },
  { url: 'https://www.instagram.com/p/ABC123/', pageType: 'post' },
  { url: 'https://www.instagram.com/reel/XYZ789/', pageType: 'reel' },
  { url: 'https://www.instagram.com/tv/VIDEO1/', pageType: 'video' },
  { url: 'https://www.instagram.com/stories/studio.north/123456/', pageType: 'story' },
  {
    url: 'https://www.instagram.com/stories/highlights/17841400000000000/',
    pageType: 'highlight',
  },
  { url: 'https://www.instagram.com/explore/tags/lighting/', pageType: 'tagged' },
  { url: 'https://www.instagram.com/studio.north/tagged/', pageType: 'tagged' },
  { url: 'https://www.instagram.com/studio.north/saved/', pageType: 'saved' },
];

const FACEBOOK_CASES: PageCase[] = [
  { url: 'https://www.facebook.com/atlasfilms', pageType: 'profile' },
  { url: 'https://www.facebook.com/', pageType: 'feed' },
  { url: 'https://www.facebook.com/posts/123456789', pageType: 'post' },
  { url: 'https://www.facebook.com/photo/?fbid=123', pageType: 'post' },
  { url: 'https://www.facebook.com/watch/?v=123', pageType: 'video' },
  { url: 'https://www.facebook.com/reel/456', pageType: 'video' },
  { url: 'https://www.facebook.com/stories/789', pageType: 'story' },
  { url: 'https://www.facebook.com/highlights/321', pageType: 'highlight' },
  { url: 'https://www.facebook.com/atlasfilms/photos_tagged', pageType: 'tagged' },
  { url: 'https://www.facebook.com/saved', pageType: 'saved' },
];

const TIKTOK_CASES: PageCase[] = [
  { url: 'https://www.tiktok.com/@studio.north', pageType: 'profile' },
  { url: 'https://www.tiktok.com/foryou', pageType: 'feed' },
  { url: 'https://www.tiktok.com/@studio.north/video/7300000000000000000', pageType: 'video' },
  { url: 'https://www.tiktok.com/@studio.north/photo/7300000000000000001', pageType: 'post' },
  { url: 'https://www.tiktok.com/@studio.north/story/123', pageType: 'story' },
  { url: 'https://www.tiktok.com/tag/lighting', pageType: 'tagged' },
  { url: 'https://www.tiktok.com/@studio.north/favorites', pageType: 'saved' },
];

function expectPageTypes(adapter: PlatformAdapter, cases: PageCase[]): void {
  for (const testCase of cases) {
    const url = new URL(testCase.url);
    expect(adapter.matches(url)).toBe(true);
    expect(adapter.detectPageType({ document, url })).toBe(testCase.pageType);
  }
}

beforeEach(() => {
  setDocumentHtml('');
});

describe('platform detection', () => {
  it('detects Instagram and every supported Instagram page type', () => {
    expect(instagramAdapter.detectPlatform(new URL('https://www.instagram.com/p/ABC/'))).toEqual({
      platform: 'instagram',
      supported: true,
      url: 'https://www.instagram.com/p/ABC/',
    });
    expectPageTypes(instagramAdapter, INSTAGRAM_CASES);
  });

  it('detects Facebook and every supported Facebook page type', () => {
    expect(facebookAdapter.detectPlatform(new URL('https://m.facebook.com/watch/?v=1'))).toEqual({
      platform: 'facebook',
      supported: true,
      url: 'https://m.facebook.com/watch/?v=1',
    });
    expectPageTypes(facebookAdapter, FACEBOOK_CASES);
  });

  it('detects TikTok and every supported TikTok page type', () => {
    expect(tiktokAdapter.detectPlatform(new URL('https://www.tiktok.com/@studio'))).toEqual({
      platform: 'tiktok',
      supported: true,
      url: 'https://www.tiktok.com/@studio',
    });
    expectPageTypes(tiktokAdapter, TIKTOK_CASES);
  });

  it('resolves the correct adapter for platform hosts and subdomains', () => {
    expect(getAdapterForUrl(new URL('https://www.instagram.com/p/1/'))?.id).toBe('instagram');
    expect(getAdapterForUrl(new URL('https://m.facebook.com/photo/?fbid=1'))?.id).toBe('facebook');
    expect(getAdapterForUrl(new URL('https://www.tiktok.com/@a/video/1'))?.id).toBe('tiktok');
    expect(getAdapterForUrl(new URL('https://example.com/post'))).toBeUndefined();
  });

  it('marks unsupported URLs without claiming platform ownership', () => {
    const url = new URL('https://example.com/post');
    expect(instagramAdapter.detectPlatform(url)).toEqual({
      platform: 'instagram',
      supported: false,
      url: url.toString(),
    });
    expect(facebookAdapter.detectPlatform(url).supported).toBe(false);
    expect(tiktokAdapter.detectPlatform(url).supported).toBe(false);
  });

  it('returns unknown page types for unrecognized paths on supported hosts', () => {
    expect(
      instagramAdapter.detectPageType({
        document,
        url: new URL('https://www.instagram.com/accounts/login/'),
      }),
    ).toBe('unknown');
    expect(
      facebookAdapter.detectPageType({
        document,
        url: new URL('https://www.facebook.com/groups/123'),
      }),
    ).toBe('unknown');
    expect(
      tiktokAdapter.detectPageType({
        document,
        url: new URL('https://www.tiktok.com/live/123'),
      }),
    ).toBe('unknown');
  });
});
