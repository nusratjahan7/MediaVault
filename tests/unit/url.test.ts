import { describe, expect, it } from 'vitest';
import { createMediaId, hashString } from '@/utils/id';
import {
  extensionFromUrl,
  hostMatches,
  isHttpUrl,
  normalizeHttpUrl,
  safeUrl,
} from '@/utils/url';

describe('safeUrl', () => {
  it('returns null for invalid URLs', () => {
    expect(safeUrl('not a url')).toBeNull();
    expect(safeUrl('')).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
  });

  it('resolves relative URLs against a base', () => {
    expect(safeUrl('/photo.jpg', 'https://www.instagram.com/p/a/')?.toString()).toBe(
      'https://www.instagram.com/photo.jpg',
    );
  });
});

describe('normalizeHttpUrl', () => {
  it('keeps signed query parameters and removes the fragment', () => {
    expect(normalizeHttpUrl('https://cdn.example.com/a.jpg?oh=1&oe=2#frag')).toBe(
      'https://cdn.example.com/a.jpg?oh=1&oe=2',
    );
  });

  it('rejects blob, data, and chrome URLs', () => {
    expect(normalizeHttpUrl('blob:https://www.instagram.com/123')).toBeNull();
    expect(normalizeHttpUrl('data:image/png;base64,abc')).toBeNull();
    expect(normalizeHttpUrl('chrome-extension://abc/icon.png')).toBeNull();
  });
});

describe('extensionFromUrl', () => {
  it('extracts allowed media extensions case-insensitively', () => {
    expect(extensionFromUrl('https://cdn.example.com/video.MP4?token=1')).toBe('mp4');
    expect(extensionFromUrl('https://cdn.example.com/photo.jpeg')).toBe('jpeg');
  });

  it('returns null for unknown extensions', () => {
    expect(extensionFromUrl('https://cdn.example.com/file.txt')).toBeNull();
    expect(extensionFromUrl('https://cdn.example.com/no-extension')).toBeNull();
  });
});

describe('hostMatches', () => {
  it('matches the domain and its subdomains', () => {
    expect(hostMatches('instagram.com', 'instagram.com')).toBe(true);
    expect(hostMatches('www.instagram.com', 'instagram.com')).toBe(true);
    expect(hostMatches('m.facebook.com', 'facebook.com')).toBe(true);
  });

  it('does not match lookalike domains', () => {
    expect(hostMatches('evilinstagram.com', 'instagram.com')).toBe(false);
    expect(hostMatches('instagram.com.evil.test', 'instagram.com')).toBe(false);
  });
});

describe('isHttpUrl', () => {
  it('accepts http and https only', () => {
    expect(isHttpUrl('https://example.com/a.mp4')).toBe(true);
    expect(isHttpUrl('http://example.com/a.mp4')).toBe(true);
    expect(isHttpUrl('ftp://example.com/a.mp4')).toBe(false);
    expect(isHttpUrl('blob:https://example.com/1')).toBe(false);
  });
});

describe('media ids', () => {
  it('are stable for the same URL', () => {
    expect(createMediaId('instagram', 'https://cdn.example.com/a.jpg')).toBe(
      createMediaId('instagram', 'https://cdn.example.com/a.jpg'),
    );
  });

  it('differ between platforms and URLs', () => {
    const first = createMediaId('instagram', 'https://cdn.example.com/a.jpg');
    expect(first).not.toBe(createMediaId('tiktok', 'https://cdn.example.com/a.jpg'));
    expect(first).not.toBe(createMediaId('instagram', 'https://cdn.example.com/b.jpg'));
    expect(hashString('abc')).toHaveLength(8);
  });
});
