import { beforeEach, describe, expect, it } from 'vitest';
import { tiktokAdapter } from '@/adapters/tiktok';
import { setDocumentHtml } from '../helpers/dom';
import videoWithThumbnailHtml from '../fixtures/tiktok/video-with-thumbnail.html?raw';
import profileEmbeddedHtml from '../fixtures/tiktok/profile-embedded.html?raw';

beforeEach(() => {
  setDocumentHtml('');
});

describe('TikTok module discovery', () => {
  it('discovers the current video and an accessible thumbnail', () => {
    setDocumentHtml(videoWithThumbnailHtml);
    const url = new URL(
      'https://www.tiktok.com/@creator/video/7300000000000000100',
    );
    const discovery = tiktokAdapter.discoverMedia({ document, url });

    expect(discovery.pageType).toBe('video');
    expect(discovery.account?.username).toBe('creator');

    const video = discovery.items.find((item) => item.kind === 'video');
    const thumbnail = discovery.items.find(
      (item) => item.filenameHint === 'tiktok-thumbnail',
    );

    expect(video).toBeDefined();
    expect(video?.url).toBe(
      'https://v16-webapp.tiktokcdn.com/video/main.mp4',
    );
    expect(video?.postId).toBe('7300000000000000100');
    expect(video?.postUrl).toBe(
      'https://www.tiktok.com/@creator/video/7300000000000000100',
    );
    expect(video?.publishedAt).toBe(1_720_000_300_000);
    expect(video?.formats).toHaveLength(2);

    expect(thumbnail).toBeDefined();
    expect(thumbnail?.kind).toBe('image');
    expect(thumbnail?.url).toBe('https://p16-sign.tiktokcdn.com/main-cover.jpg');
    expect(thumbnail?.downloadable).toBe(true);
    expect(thumbnail?.postId).toBe('7300000000000000100');
    expect(tiktokAdapter.getDownloadOptions(thumbnail!)[0]).toMatchObject({
      extension: 'jpg',
      isDefault: true,
    });

    const options = tiktokAdapter.getDownloadOptions(video!);
    expect(options).toHaveLength(2);
    expect(options[0]?.isDefault).toBe(true);
    expect(
      discovery.limitations.map((limitation) => limitation.code),
    ).toContain('signed-url-expiry');
  });

  it('discovers multiple embedded profile videos plus visible profile-card media', () => {
    setDocumentHtml(profileEmbeddedHtml);
    const url = new URL('https://www.tiktok.com/@creator');
    const discovery = tiktokAdapter.discoverMedia({ document, url });

    expect(discovery.pageType).toBe('profile');
    expect(discovery.account?.username).toBe('creator');

    const embeddedVideos = discovery.items.filter(
      (item) =>
        item.kind === 'video' &&
        item.downloadable &&
        ['111', '222'].includes(item.postId ?? ''),
    );
    expect(embeddedVideos).toHaveLength(2);
    expect(embeddedVideos.map((item) => item.author)).toEqual([
      'creator',
      'creator',
    ]);
    expect(embeddedVideos.map((item) => item.postUrl)).toEqual([
      'https://www.tiktok.com/@creator/video/111',
      'https://www.tiktok.com/@creator/video/222',
    ]);

    const cardVideo = discovery.items.find(
      (item) => item.kind === 'video' && item.postId === '333',
    );
    expect(cardVideo).toBeDefined();
    expect(cardVideo?.downloadable).toBe(false);
    expect(cardVideo?.unsupportedReason).toMatch(/Open this video/i);
    expect(cardVideo?.thumbnailUrl).toBe(
      'https://p16-sign.tiktokcdn.com/three-cover.jpg',
    );

    const thumbnails = discovery.items.filter(
      (item) => item.filenameHint === 'tiktok-thumbnail',
    );
    expect(thumbnails.map((item) => item.postId).sort()).toEqual([
      '111',
      '222',
      '333',
    ]);
    expect(thumbnails.every((item) => item.downloadable)).toBe(true);
    expect(
      discovery.limitations.map((limitation) => limitation.code),
    ).toContain('lazy-loaded');
  });

  it('discovers a profile card even when no embedded item list exists', () => {
    setDocumentHtml(
      `<html><head><meta property="og:title" content="Creator (@creator) • TikTok" /></head><body>
        <main>
          <a href="/@creator/video/444">
            <img src="https://p16-sign.tiktokcdn.com/card-444.jpg" width="400" height="500" alt="Card" />
          </a>
        </main>
      </body></html>`,
    );

    const discovery = tiktokAdapter.discoverMedia({
      document,
      url: new URL('https://www.tiktok.com/@creator'),
    });

    expect(discovery.items.some((item) => item.kind === 'video' && !item.downloadable)).toBe(
      true,
    );
    expect(
      discovery.items.some((item) => item.filenameHint === 'tiktok-thumbnail'),
    ).toBe(true);
    expect(
      discovery.limitations.find((limitation) => limitation.code === 'lazy-loaded')
        ?.message,
    ).toMatch(/Profile video cards are links/i);
  });

  it('reports private content without trying to access it', () => {
    setDocumentHtml(
      `<html><head><meta property="og:title" content="Creator (@creator) • TikTok" /></head>
      <body><p>This content isn't available right now</p></body></html>`,
    );

    const discovery = tiktokAdapter.discoverMedia({
      document,
      url: new URL('https://www.tiktok.com/@creator/video/999'),
    });

    expect(discovery.items).toHaveLength(0);
    expect(
      discovery.limitations.find((limitation) => limitation.code === 'private-content')
        ?.severity,
    ).toBe('blocking');
  });
});
