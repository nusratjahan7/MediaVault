import { beforeEach, describe, expect, it } from 'vitest';
import { facebookAdapter } from '@/adapters/facebook';
import { setDocumentHtml } from '../helpers/dom';
import albumHtml from '../fixtures/facebook/album.html?raw';
import embeddedVideoHtml from '../fixtures/facebook/video-embedded.html?raw';

beforeEach(() => {
  setDocumentHtml('');
});

describe('Facebook module discovery', () => {
  it('discovers album photos with per-photo post context and album metadata', () => {
    setDocumentHtml(albumHtml);
    const url = new URL('https://www.facebook.com/media/set/?set=a.999');
    const discovery = facebookAdapter.discoverMedia({ document, url });

    expect(discovery.pageType).toBe('album');
    expect(discovery.account).toMatchObject({
      platform: 'facebook',
      username: 'atlasfilms',
      displayName: 'Atlas Films',
    });

    const linked = discovery.items.filter((item) =>
      ['101', '102'].includes(item.postId ?? ''),
    );
    expect(linked).toHaveLength(2);
    expect(linked[0]).toMatchObject({
      postId: '101',
      postUrl: 'https://www.facebook.com/photo/?fbid=101&set=a.999',
      kind: 'image',
      downloadable: true,
      downloadStatus: 'available',
    });
    expect(linked[1]?.postUrl).toBe(
      'https://www.facebook.com/photo.php?fbid=102&set=a.999',
    );
    expect(linked[0]?.publishedAt).toBe(1_720_094_400_000);
    expect(linked[0]?.formats?.length).toBeGreaterThan(0);
    expect(facebookAdapter.getDownloadOptions(linked[0]!)[0]).toMatchObject({
      extension: 'jpg',
      isDefault: true,
    });
    expect(
      discovery.limitations.find((limitation) =>
        limitation.message.includes('Album downloads include'),
      ),
    ).toBeDefined();
  });

  it('uses embedded HD/SD sources instead of assuming every video is downloadable', () => {
    setDocumentHtml(embeddedVideoHtml);
    const url = new URL('https://www.facebook.com/watch/?v=555');
    const discovery = facebookAdapter.discoverMedia({ document, url });
    const video = discovery.items.find((item) => item.kind === 'video');

    expect(discovery.pageType).toBe('video');
    expect(video?.url).toBe(
      'https://video.xx.fbcdn.net/v/t42/hd-source.mp4?token=hd',
    );
    expect(video?.downloadable).toBe(true);
    expect(video?.formats).toHaveLength(2);
    expect(video?.postId).toBe('555');
    expect(video?.caption).toBe('Behind the scenes in the cutting room');

    const options = facebookAdapter.getDownloadOptions(video!);
    expect(options).toHaveLength(2);
    expect(options[0]?.isDefault).toBe(true);
    expect(options[1]?.isDefault).toBe(false);
  });

  it('treats Facebook reels as their own page type while using the same media rules', () => {
    setDocumentHtml(embeddedVideoHtml);
    const url = new URL('https://www.facebook.com/reel/555');
    const discovery = facebookAdapter.discoverMedia({ document, url });

    expect(discovery.pageType).toBe('reel');
    expect(discovery.items.some((item) => item.kind === 'video')).toBe(true);
  });

  it('reports a page-only video link as unavailable', () => {
    setDocumentHtml(
      `<html><head>
        <meta property="og:video" content="https://www.facebook.com/video.php?v=123" />
        <meta property="og:image" content="https://scontent.xx.fbcdn.net/v/t15/cover.jpg" />
      </head><body></body></html>`,
    );

    const url = new URL('https://www.facebook.com/watch/?v=123');
    const discovery = facebookAdapter.discoverMedia({ document, url });

    expect(discovery.items.some((item) => item.kind === 'video')).toBe(false);
    const codes = discovery.limitations.map((limitation) => limitation.code);
    expect(codes).toContain('unsupported-media');
    expect(codes).toContain('no-media');
  });

  it('discovers media on profile/page surfaces with the visible account', () => {
    setDocumentHtml(
      `<html><head>
        <meta property="og:title" content="Atlas Films | Facebook" />
      </head><body>
        <h2><a role="link" href="/atlasfilms">Atlas Films</a></h2>
        <main>
          <img src="https://scontent.xx.fbcdn.net/v/t1/page-photo.jpg" width="1200" height="800" alt="Page photo" />
        </main>
      </body></html>`,
    );

    const url = new URL('https://www.facebook.com/atlasfilms');
    const discovery = facebookAdapter.discoverMedia({ document, url });

    expect(discovery.pageType).toBe('profile');
    expect(discovery.account?.username).toBe('atlasfilms');
    const image = discovery.items.find((item) => item.kind === 'image');
    expect(image?.url).toBe(
      'https://scontent.xx.fbcdn.net/v/t1/page-photo.jpg',
    );
    expect(image?.sourcePageUrl).toBe(url.toString());
    expect(image?.downloadStatus).toBe('available');
  });

  it('parses alternate Facebook photo URL formats', () => {
    setDocumentHtml(
      `<html><head>
        <meta property="og:title" content="Atlas Films | Facebook" />
        <meta property="og:image" content="https://scontent.xx.fbcdn.net/v/t1/alt-photo.jpg" />
      </head><body></body></html>`,
    );

    for (const href of [
      'https://www.facebook.com/photo.php?fbid=777',
      'https://www.facebook.com/photo/?fbid=777',
    ]) {
      const discovery = facebookAdapter.discoverMedia({
        document,
        url: new URL(href),
      });
      expect(discovery.pageType).toBe('post');
      expect(discovery.items[0]?.postId).toBe('777');
    }
  });
});
