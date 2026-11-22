import { beforeEach, describe, expect, it } from 'vitest';
import { extractInstagram } from '@/adapters/instagram/extract';
import { setDocumentHtml } from '../helpers/dom';
import postHtml from '../fixtures/instagram/post.html?raw';
import blobReelHtml from '../fixtures/instagram/blob-reel.html?raw';

beforeEach(() => {
  setDocumentHtml('');
});

describe('Instagram adapter', () => {
  it('extracts og video, rendered video, and photos while filtering UI assets', () => {
    setDocumentHtml(postHtml);

    const result = extractInstagram({
      document,
      url: new URL('https://www.instagram.com/p/ABC123/'),
    });

    const videos = result.items.filter((item) => item.kind === 'video');
    const images = result.items.filter((item) => item.kind === 'image');

    expect(videos).toHaveLength(2);
    expect(videos.map((item) => item.url)).toContain(
      'https://scontent.cdninstagram.com/v/t50/og-video.mp4',
    );
    expect(videos.map((item) => item.url)).toContain(
      'https://scontent.cdninstagram.com/v/t50/clip.mp4',
    );
    expect(images).toHaveLength(2);
    expect(result.items.every((item) => !item.url.includes('rsrc.php'))).toBe(true);
    expect(result.items[0]?.author).toBe('studio');
    expect(result.items[0]?.caption).toBe('Behind the scenes at the studio');
    expect(result.limitations.some((entry) => entry.code === 'partial-extraction')).toBe(true);
  });

  it('marks blob videos as non-downloadable and surfaces the limitation', () => {
    setDocumentHtml(blobReelHtml);

    const result = extractInstagram({
      document,
      url: new URL('https://www.instagram.com/reel/XYZ789/'),
    });

    const video = result.items.find((item) => item.kind === 'video');

    expect(video).toBeDefined();
    expect(video?.downloadable).toBe(false);
    expect(video?.unsupportedReason).toMatch(/streamed/i);
    expect(video?.thumbnailUrl).toBe(
      'https://scontent.cdninstagram.com/v/t51/blob-poster.jpg',
    );
    expect(result.limitations.map((entry) => entry.code)).toContain('blob-video');
    expect(result.limitations.map((entry) => entry.code)).not.toContain('no-media');
  });

  it('reports private content instead of trying to bypass it', () => {
    setDocumentHtml(
      '<html><body><main><h1>This account is private</h1><p>Follow to see photos.</p></main></body></html>',
    );

    const result = extractInstagram({
      document,
      url: new URL('https://www.instagram.com/privateuser/'),
    });

    expect(result.items).toHaveLength(0);
    expect(result.limitations.map((entry) => entry.code)).toContain('private-content');
    expect(result.limitations.map((entry) => entry.code)).toContain('no-media');
  });
});
