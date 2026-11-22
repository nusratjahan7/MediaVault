import { describe, expect, it } from 'vitest';
import { instagramAdapter } from '@/adapters/instagram';
import { setDocumentHtml } from '../helpers/dom';
import reelHtml from '../fixtures/instagram/reel-embedded.html?raw';

describe('Instagram direct video resolution', () => {
  it('uses embedded direct video versions and ignores the page-link og:video', () => {
    setDocumentHtml(reelHtml);
    const result = instagramAdapter.discoverMedia({
      document,
      url: new URL('https://www.instagram.com/reel/REEL123/'),
    });
    const video = result.items.find((item) => item.kind === 'video');

    expect(video).toBeDefined();
    expect(video?.downloadable).toBe(true);
    expect(video?.url).toBe(
      'https://scontent.cdninstagram.com/v/t51/reel-1080.mp4?token=hd',
    );
    expect(video?.formats?.length).toBeGreaterThanOrEqual(2);
    expect(video?.formats?.some((format) => format.url?.endsWith('/REEL123/'))).toBe(
      false,
    );
    expect(video?.filenameHint).toBe('instagram-video');
  });

  it('does not expose a page URL as a downloadable video', () => {
    setDocumentHtml(
      `<html><head>
        <meta property="og:video" content="https://www.instagram.com/reel/NOPE/" />
      </head><body><article><a href="/reel/NOPE/"><video></video></a></article></body></html>`,
    );

    const result = instagramAdapter.discoverMedia({
      document,
      url: new URL('https://www.instagram.com/reel/NOPE/'),
    });

    expect(result.items.some((item) => item.kind === 'video' && item.downloadable)).toBe(
      false,
    );
  });
});
