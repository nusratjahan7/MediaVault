import { describe, expect, it } from 'vitest';
import { formatStoryExpiration, storyGroupKey } from '@/utils/story';

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);

describe('story helpers', () => {
  it('formats upcoming expiration times', () => {
    expect(formatStoryExpiration(NOW + 5 * 60 * 60 * 1000, NOW)).toBe(
      'Expires in 5h',
    );
    expect(formatStoryExpiration(NOW + 30 * 60 * 60 * 1000, NOW)).toBe(
      'Expires in 2d',
    );
  });

  it('marks expired and unknown expiration states', () => {
    expect(formatStoryExpiration(NOW - 1, NOW)).toBe('Expired');
    expect(formatStoryExpiration(undefined, NOW)).toBe('Expiration unknown');
  });

  it('groups accounts by username or display name', () => {
    expect(storyGroupKey({ username: 'creator', displayName: 'Creator' })).toBe(
      'creator',
    );
    expect(storyGroupKey({ displayName: 'Creator' })).toBe('Creator');
    expect(storyGroupKey(null)).toBe('Unknown account');
  });
});
