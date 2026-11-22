import type { MediaItem, MediaKind } from '@/types/media';
import { extensionFromUrl, safeUrl } from '@/utils/url';

const MEDIA_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'jfif',
  'png',
  'webp',
  'gif',
  'avif',
  'mp4',
  'webm',
  'mov',
  'm4v',
]);

const KNOWN_MEDIA_HOSTS = [
  'cdninstagram.com',
  'fbcdn.net',
  'tiktokcdn.com',
  'tiktokcdn-us.com',
  'tiktokcdn-eu.com',
  'ibytedtos.com',
];

const PLATFORM_PAGE_HOSTS = ['instagram.com', 'facebook.com', 'tiktok.com'];

const PLATFORM_PAGE_PATH =
  /^\/(?:p|reel|reels|tv|stories|explore|accounts|direct|share|photo|photos|photo\.php|permalink|permalink\.php|watch|videos|video\.php|story|stories|album|media\/set|profile\.php|people|pages|@[^/]+(?:\/(?:video|photo))?)(?:\/|$)/i;

function hostMatches(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function isPlatformPageUrl(raw: string): boolean {
  const url = safeUrl(raw);
  if (!url) {
    return false;
  }

  const hostname = url.hostname.toLowerCase();
  if (!PLATFORM_PAGE_HOSTS.some((domain) => hostMatches(hostname, domain))) {
    return false;
  }

  return PLATFORM_PAGE_PATH.test(url.pathname);
}

/**
 * Validate a URL before handing it to Chrome Downloads. This rejects page URLs,
 * blob/stream manifests, and unknown extensionless hosts so a page can never be
 * renamed as .mp4 and reported as a successful video download.
 */
export function isLikelyMediaUrl(
  raw: string | null | undefined,
  kind?: MediaKind,
): boolean {
  const url = safeUrl(raw);
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    return false;
  }

  const path = url.pathname.toLowerCase();
  if (/\.(m3u8|mpd|m4s|ts)$/i.test(path) || /\/manifest(?:\.|\/|$)/i.test(path)) {
    return false;
  }

  if (isPlatformPageUrl(url.toString())) {
    return false;
  }

  const extension = extensionFromUrl(url.toString());
  if (extension && MEDIA_EXTENSIONS.has(extension)) {
    return true;
  }

  const hostname = url.hostname.toLowerCase();
  if (KNOWN_MEDIA_HOSTS.some((domain) => hostMatches(hostname, domain))) {
    return true;
  }

  // Some TikTok playback hosts are under tiktok.com but use a /video/tos/ path.
  if (hostMatches(hostname, 'tiktok.com') && /\/video\/tos\//i.test(url.pathname)) {
    return true;
  }

  const mime = url.searchParams.get('mime_type')?.toLowerCase() ?? '';
  if (
    kind === 'video' &&
    (mime.includes('video/mp4') || mime.includes('video/webm'))
  ) {
    return true;
  }

  return false;
}

export function invalidMediaReason(kind: MediaKind): string {
  return kind === 'video'
    ? 'No direct video file was exposed. The page may use a protected or adaptive stream; MediaVault does not reconstruct or bypass it.'
    : 'No direct image file was exposed by this page.';
}

export function resolveMediaItem(item: MediaItem): MediaItem {
  if (!item.downloadable || isLikelyMediaUrl(item.url, item.kind)) {
    return item;
  }

  return {
    ...item,
    downloadable: false,
    downloadStatus: 'unsupported',
    unsupportedReason: invalidMediaReason(item.kind),
    formats: [],
  };
}
