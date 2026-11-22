import { describe, expect, it } from 'vitest';
import { isLikelyMediaUrl } from '@/downloads/media-resolver';

describe('media URL resolution', () => {
  it('accepts direct platform CDN media and known extensions', () => {
    expect(
      isLikelyMediaUrl(
        'https://scontent.cdninstagram.com/v/t51/reel-1080.mp4',
        'video',
      ),
    ).toBe(true);
    expect(
      isLikelyMediaUrl('https://scontent.xx.fbcdn.net/v/t42/video', 'video'),
    ).toBe(true);
    expect(
      isLikelyMediaUrl('https://p16-sign.tiktokcdn.com/photo.jpg', 'image'),
    ).toBe(true);
    expect(
      isLikelyMediaUrl('https://example.com/media/clip.webm', 'video'),
    ).toBe(true);
  });

  it('rejects page URLs, blob URLs, HLS/DASH manifests, and unknown bare hosts', () => {
    expect(
      isLikelyMediaUrl('https://www.instagram.com/reel/ABC123/', 'video'),
    ).toBe(false);
    expect(
      isLikelyMediaUrl('https://www.facebook.com/watch/?v=123', 'video'),
    ).toBe(false);
    expect(
      isLikelyMediaUrl('https://www.tiktok.com/@creator/video/730', 'video'),
    ).toBe(false);
    expect(isLikelyMediaUrl('blob:https://www.instagram.com/abc', 'video')).toBe(false);
    expect(
      isLikelyMediaUrl('https://cdn.example.com/master.m3u8', 'video'),
    ).toBe(false);
    expect(
      isLikelyMediaUrl('https://cdn.example.com/manifest.mpd', 'video'),
    ).toBe(false);
    expect(isLikelyMediaUrl('https://example.com/watch', 'video')).toBe(false);
  });
});
