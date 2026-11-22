import { PLATFORM_META } from '@/constants';
import type { PlatformId } from '@/types/platform';

export const PROFILE_USERNAME_PATTERN = /^[^\s/\\?#]{1,80}$/u;

export function normalizeProfileUsername(value: string): string {
  return value.trim().replace(/^@+/, '');
}

export function defaultProfileUrl(platform: PlatformId, username: string): string {
  const handle = encodeURIComponent(normalizeProfileUsername(username));

  if (platform === 'instagram') {
    return `https://www.instagram.com/${handle}/`;
  }

  if (platform === 'facebook') {
    return `https://www.facebook.com/${handle}/`;
  }

  return `https://www.tiktok.com/@${handle}`;
}

export function parseProfileUrlForPlatform(
  platform: PlatformId,
  raw: string,
): string | null {
  try {
    const parsed = new URL(raw);
    if (!/^https?:$/.test(parsed.protocol)) {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    const matches = PLATFORM_META[platform].hostnames.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );

    return matches ? parsed.toString() : null;
  } catch {
    return null;
  }
}
