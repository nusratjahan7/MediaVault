import { beforeEach, describe, expect, it } from 'vitest';
import { extractFacebook } from '@/adapters/facebook/extract';
import { setDocumentHtml } from '../helpers/dom';
import photoHtml from '../fixtures/facebook/photo.html?raw';
import blobVideoHtml from '../fixtures/facebook/blob-video.html?raw';

beforeEach(() => {
  setDocumentHtml('');
});

describe('Facebook adapter', () => {
  it('extracts a public photo and deduplicates og and DOM images', () => {
    setDocumentHtml(photoHtml);

    const result = extractFacebook({
      document,
      url: new URL('https://www.facebook.com/photo/?fbid=123'),
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.kind).toBe('image');
    expect(result.items[0]?.url).toBe('https://scontent.xx.fbcdn.net/v/t1/photo.jpg');
    expect(result.items[0]?.author).toBe('Page Name');
    expect(result.items[0]?.caption).toBe('A day at the lake');
  });

  it('does not attempt to reconstruct adaptive video streams', () => {
    setDocumentHtml(blobVideoHtml);

    const result = extractFacebook({
      document,
      url: new URL('https://www.facebook.com/watch/?v=123'),
    });

    const video = result.items.find((item) => item.kind === 'video');
    const codes = result.limitations.map((entry) => entry.code);

    expect(video).toBeDefined();
    expect(video?.downloadable).toBe(false);
    expect(video?.thumbnailUrl).toBe('https://scontent.xx.fbcdn.net/v/t15/poster.jpg');
    expect(codes).toContain('blob-video');
    expect(codes).toContain('unsupported-media');
  });

  it('extracts a direct og:video URL when Facebook exposes one', () => {
    setDocumentHtml(
      `<html><head>
        <meta property="og:title" content="Creator Page" />
        <meta property="og:video:secure_url" content="https://video.xx.fbcdn.net/v/t42/direct.mp4" />
        <meta property="og:image" content="https://scontent.xx.fbcdn.net/v/t15/cover.jpg" />
      </head><body><div role="article"></div></body></html>`,
    );

    const result = extractFacebook({
      document,
      url: new URL('https://www.facebook.com/watch/?v=999'),
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.kind).toBe('video');
    expect(result.items[0]?.downloadable).toBe(true);
    expect(result.items[0]?.thumbnailUrl).toBe('https://scontent.xx.fbcdn.net/v/t15/cover.jpg');
  });

  it('surfaces a login wall as a blocking limitation', () => {
    setDocumentHtml(
      '<html><body><form><input type="password" /></form><p>Log in to continue</p></body></html>',
    );

    const result = extractFacebook({
      document,
      url: new URL('https://www.facebook.com/photo/?fbid=1'),
    });

    const login = result.limitations.find((entry) => entry.code === 'login-required');
    expect(login?.severity).toBe('blocking');
  });
});
