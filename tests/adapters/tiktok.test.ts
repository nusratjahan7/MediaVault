import { beforeEach, describe, expect, it } from 'vitest';
import { extractTikTok } from '@/adapters/tiktok/extract';
import { setDocumentHtml } from '../helpers/dom';
import videoHtml from '../fixtures/tiktok/video.html?raw';
import slideshowHtml from '../fixtures/tiktok/slideshow.html?raw';

beforeEach(() => {
  setDocumentHtml('');
});

describe('TikTok adapter', () => {
  it('reads public embedded page data without private APIs', () => {
    setDocumentHtml(videoHtml);

    const result = extractTikTok({
      document,
      url: new URL('https://www.tiktok.com/@creator/video/7300000000000000000'),
    });

    const videos = result.items.filter((item) => item.kind === 'video');
    const images = result.items.filter((item) => item.kind === 'image');

    expect(videos).toHaveLength(1);
    expect(videos[0]?.url).toBe('https://v16-webapp.tiktokcdn.com/video/play.mp4');
    expect(videos[0]?.author).toBe('creator');
    expect(videos[0]?.durationSeconds).toBe(15);
    expect(videos[0]?.width).toBe(1080);
    expect(images).toHaveLength(2);
    expect(images[0]?.url).toBe('https://p16-sign.tiktokcdn.com/slide-1.jpg');
    expect(result.limitations.map((entry) => entry.code)).toContain('partial-extraction');
    expect(result.limitations.map((entry) => entry.code)).toContain('signed-url-expiry');
  });

  it('extracts slideshow images and notes the separate audio track', () => {
    setDocumentHtml(slideshowHtml);

    const result = extractTikTok({
      document,
      url: new URL('https://www.tiktok.com/@gallery/photo/7300000000000000001'),
    });

    expect(result.items).toHaveLength(2);
    expect(result.items.every((item) => item.kind === 'image')).toBe(true);
    expect(
      result.limitations.find((entry) => entry.code === 'partial-extraction')?.message,
    ).toMatch(/audio/i);
  });

  it('parses the legacy SIGI_STATE payload as a fallback', () => {
    setDocumentHtml(
      `<html><body>
        <script id="SIGI_STATE" type="application/json">
          {
            "ItemModule": {
              "7301": {
                "id": "7301",
                "desc": "Legacy clip",
                "author": { "uniqueId": "legacy" },
                "video": { "playAddr": "https://v16.tiktokcdn.com/legacy.mp4", "duration": 9 }
              }
            }
          }
        </script>
      </body></html>`,
    );

    const result = extractTikTok({
      document,
      url: new URL('https://www.tiktok.com/@legacy/video/7301'),
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.url).toBe('https://v16.tiktokcdn.com/legacy.mp4');
    expect(result.items[0]?.author).toBe('legacy');
  });

  it('reports no media instead of inventing a download link', () => {
    setDocumentHtml(
      '<html><body><video src="blob:https://www.tiktok.com/abc"></video></body></html>',
    );

    const result = extractTikTok({
      document,
      url: new URL('https://www.tiktok.com/@creator'),
    });

    expect(result.items).toHaveLength(0);
    expect(result.limitations.map((entry) => entry.code)).toContain('blob-video');
    expect(result.limitations.map((entry) => entry.code)).toContain('partial-extraction');
    expect(result.limitations.map((entry) => entry.code)).toContain('no-media');
  });
});
