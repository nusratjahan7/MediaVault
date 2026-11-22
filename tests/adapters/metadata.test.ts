import { beforeEach, describe, expect, it } from 'vitest';
import {
  facebookAdapter,
  instagramAdapter,
  tiktokAdapter,
} from '@/adapters';
import { BasePlatformAdapter } from '@/adapters/base-adapter';
import type { ExtractContext, ExtractResult } from '@/adapters/types';
import type { AccountIdentity, PageType } from '@/types/page';
import { setDocumentHtml } from '../helpers/dom';
import instagramPostHtml from '../fixtures/instagram/post.html?raw';
import instagramBlobHtml from '../fixtures/instagram/blob-reel.html?raw';
import facebookPhotoHtml from '../fixtures/facebook/photo.html?raw';
import facebookBlobVideoHtml from '../fixtures/facebook/blob-video.html?raw';
import tiktokVideoHtml from '../fixtures/tiktok/video.html?raw';
import tiktokSlideshowHtml from '../fixtures/tiktok/slideshow.html?raw';

function context(html: string, href: string): ExtractContext {
  setDocumentHtml(html);
  return { document, url: new URL(href) };
}

beforeEach(() => {
  setDocumentHtml('');
});

describe('Instagram metadata', () => {
  it('normalizes permitted post metadata, account, formats, and download status', () => {
    const ctx = context(instagramPostHtml, 'https://www.instagram.com/p/ABC123/');
    const discovery = instagramAdapter.discoverMedia(ctx);
    const video = discovery.items.find((item) => item.kind === 'video');

    expect(discovery.platform).toBe('instagram');
    expect(discovery.pageType).toBe('post');
    expect(discovery.account).toMatchObject({
      platform: 'instagram',
      username: 'studio',
      displayName: 'Studio',
    });

    expect(video).toBeDefined();
    expect(video?.platform).toBe('instagram');
    expect(video?.author).toBe('studio');
    expect(video?.account?.username).toBe('studio');
    expect(video?.kind).toBe('video');
    expect(video?.url).toBe('https://scontent.cdninstagram.com/v/t50/og-video.mp4');
    expect(video?.thumbnailUrl).toBe('https://scontent.cdninstagram.com/v/t51/cover.jpg');
    expect(video?.caption).toBe('Behind the scenes at the studio');
    expect(video?.postId).toBe('ABC123');
    expect(video?.publishedAt).toBe(Date.parse('2025-06-14T18:30:00.000Z'));
    expect(video?.sourcePageUrl).toBe('https://www.instagram.com/p/ABC123/');
    expect(video?.formats?.length).toBeGreaterThan(0);
    expect(video?.downloadStatus).toBe('available');

    const options = instagramAdapter.getDownloadOptions(video!);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      extension: 'mp4',
      kind: 'video',
      isDefault: true,
      quality: 'source',
    });
    expect(instagramAdapter.extractMetadata(ctx)).toHaveLength(discovery.items.length);
  });

  it('keeps blob-only media metadata without offering a download option', () => {
    const ctx = context(instagramBlobHtml, 'https://www.instagram.com/reel/XYZ789/');
    const discovery = instagramAdapter.discoverMedia(ctx);
    const video = discovery.items.find((item) => item.kind === 'video');

    expect(discovery.pageType).toBe('reel');
    expect(video?.downloadStatus).toBe('unsupported');
    expect(video?.formats).toEqual([]);
    expect(video?.downloadable).toBe(false);
    expect(instagramAdapter.getDownloadOptions(video!)).toEqual([]);
  });

  it('marks media as restricted instead of bypassing a login wall', () => {
    const ctx = context(
      `<html><head>
        <meta property="og:image" content="https://scontent.cdninstagram.com/v/locked.jpg" />
      </head><body>
        <form><input type="password" /></form>
        <p>Log in to continue</p>
      </body></html>`,
      'https://www.instagram.com/p/LOCKED1/',
    );

    const discovery = instagramAdapter.discoverMedia(ctx);
    const item = discovery.items[0];

    expect(
      discovery.limitations.find((limitation) => limitation.code === 'login-required')
        ?.severity,
    ).toBe('blocking');
    expect(item?.downloadStatus).toBe('restricted');
    expect(item?.downloadable).toBe(false);
    expect(item?.formats).toEqual([]);
    expect(instagramAdapter.getDownloadOptions(item!)).toEqual([]);
  });
});

describe('Facebook metadata', () => {
  it('normalizes photo metadata with Facebook-specific account identity', () => {
    const ctx = context(facebookPhotoHtml, 'https://www.facebook.com/photo/?fbid=123');
    const discovery = facebookAdapter.discoverMedia(ctx);
    const photo = discovery.items[0];

    expect(discovery.pageType).toBe('post');
    expect(discovery.account).toMatchObject({
      platform: 'facebook',
      displayName: 'Page Name',
    });
    expect(photo?.platform).toBe('facebook');
    expect(photo?.kind).toBe('image');
    expect(photo?.author).toBe('Page Name');
    expect(photo?.postId).toBe('123');
    expect(photo?.publishedAt).toBe(Date.parse('2025-05-02T11:00:00.000Z'));
    expect(photo?.caption).toBe('A day at the lake');
    expect(photo?.downloadStatus).toBe('available');
    expect(facebookAdapter.getDownloadOptions(photo!)[0]).toMatchObject({
      extension: 'jpg',
      isDefault: true,
    });
  });

  it('returns no download options for adaptive Facebook video', () => {
    const ctx = context(facebookBlobVideoHtml, 'https://www.facebook.com/watch/?v=123');
    const discovery = facebookAdapter.discoverMedia(ctx);
    const video = discovery.items.find((item) => item.kind === 'video');

    expect(discovery.pageType).toBe('video');
    expect(video?.downloadStatus).toBe('unsupported');
    expect(video?.formats).toEqual([]);
    expect(facebookAdapter.getDownloadOptions(video!)).toEqual([]);
    expect(discovery.limitations.map((limitation) => limitation.code)).toContain(
      'blob-video',
    );
  });
});

describe('TikTok metadata', () => {
  it('normalizes embedded page data, formats, and post date', () => {
    const ctx = context(
      tiktokVideoHtml,
      'https://www.tiktok.com/@creator/video/7300000000000000000',
    );
    const discovery = tiktokAdapter.discoverMedia(ctx);
    const video = discovery.items.find((item) => item.kind === 'video');

    expect(discovery.pageType).toBe('video');
    expect(discovery.account).toMatchObject({
      platform: 'tiktok',
      username: 'creator',
      displayName: 'North Studio',
    });
    expect(video?.platform).toBe('tiktok');
    expect(video?.author).toBe('creator');
    expect(video?.postId).toBe('7300000000000000000');
    expect(video?.publishedAt).toBe(1_720_000_000_000);
    expect(video?.caption).toBe('A very cool clip');
    expect(video?.downloadStatus).toBe('available');
    expect(video?.formats).toHaveLength(2);

    const options = tiktokAdapter.getDownloadOptions(video!);
    expect(options).toHaveLength(2);
    expect(options.map((option) => option.label)).toEqual([
      'MP4 · Playback',
      'MP4 · Download copy',
    ]);
    expect(options[0]?.isDefault).toBe(true);
    expect(options[1]?.isDefault).toBe(false);
  });

  it('keeps slideshow image metadata while reporting platform limits', () => {
    const ctx = context(
      tiktokSlideshowHtml,
      'https://www.tiktok.com/@gallery/photo/7300000000000000001',
    );
    const discovery = tiktokAdapter.discoverMedia(ctx);

    expect(discovery.pageType).toBe('post');
    expect(discovery.account?.username).toBe('gallery');
    expect(discovery.items).toHaveLength(2);
    expect(discovery.items.every((item) => item.kind === 'image')).toBe(true);
    expect(discovery.items.every((item) => item.publishedAt === 1_721_000_000_000)).toBe(true);
    expect(discovery.limitations.map((limitation) => limitation.code)).toContain(
      'partial-extraction',
    );
  });
});

describe('graceful adapter failure', () => {
  it('returns a warning instead of throwing when extraction fails', () => {
    class BrokenAdapter extends BasePlatformAdapter {
      readonly id = 'instagram' as const;
      readonly label = 'Broken';
      matches(): boolean {
        return true;
      }
      detectPageType(): PageType {
        return 'unknown';
      }
      identifyAccount(): AccountIdentity | null {
        return null;
      }
      protected discoverRawMedia(): ExtractResult {
        throw new Error('Unexpected DOM shape');
      }
    }

    const discovery = new BrokenAdapter().discoverMedia({
      document,
      url: new URL('https://www.instagram.com/'),
    });

    expect(discovery.items).toEqual([]);
    expect(discovery.pageType).toBe('unknown');
    expect(discovery.limitations[0]).toMatchObject({
      code: 'partial-extraction',
      severity: 'warning',
    });
  });
});
