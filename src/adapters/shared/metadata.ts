import type {
  DownloadOption,
  MediaFormat,
  MediaItem,
} from '@/types/media';
import type { AccountIdentity, PageType } from '@/types/page';
import type { PlatformId } from '@/types/platform';
import { createMediaId } from '@/utils/id';
import { extensionFromUrl, isHttpUrl, normalizeHttpUrl } from '@/utils/url';
import type { ExtractContext } from '../types';
import { metaContent, ogContent } from './dom';

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
};

function parseTimestamp(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function metaPublishedAt(document: Document): number | undefined {
  const candidates = [
    metaContent(document, 'meta[property="article:published_time"]'),
    metaContent(document, 'meta[property="og:published_time"]'),
    metaContent(document, 'meta[itemprop="datePublished"]'),
    metaContent(document, 'meta[name="date"]'),
    ogContent(document, 'article:published_time'),
    document.querySelector<HTMLTimeElement>('time[datetime]')?.getAttribute('datetime') ??
      undefined,
  ];

  for (const candidate of candidates) {
    const parsed = parseTimestamp(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  return undefined;
}

export function postIdFromUrl(platform: PlatformId, url: URL): string | undefined {
  if (platform === 'instagram') {
    const post = /\/(?:p|reel|reels|tv)\/([^/?#]+)/.exec(url.pathname);
    if (post?.[1]) {
      return decodeURIComponent(post[1]);
    }

    const highlight = /^\/stories\/highlights\/([^/?#]+)/.exec(url.pathname);
    if (highlight?.[1]) {
      return decodeURIComponent(highlight[1]);
    }

    const story = /^\/stories\/[^/]+\/([^/?#]+)/.exec(url.pathname);
    return story?.[1] ? decodeURIComponent(story[1]) : undefined;
  }

  if (platform === 'facebook') {
    const queryId =
      url.searchParams.get('fbid') ??
      url.searchParams.get('v') ??
      url.searchParams.get('story_fbid');

    if (queryId) {
      return queryId;
    }

    const path = /\/(?:videos|reel|posts|photo)\/([^/?#]+)/.exec(url.pathname);
    return path?.[1] ? decodeURIComponent(path[1]) : undefined;
  }

  if (platform === 'tiktok') {
    const match = /\/(?:video|photo)\/([^/?#]+)/.exec(url.pathname);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  }

  return undefined;
}

export function inferFormats(item: MediaItem): MediaFormat[] {
  if (!item.downloadable || !isHttpUrl(item.url)) {
    return [];
  }

  const extension = extensionFromUrl(item.url) ?? (item.kind === 'video' ? 'mp4' : 'jpg');

  return [
    {
      id: `${item.kind}-${extension}-source`,
      label: `${extension.toUpperCase()} · Source`,
      extension,
      mimeType: MIME_TYPES[extension] ?? (item.kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      kind: item.kind,
      quality: 'source',
      url: item.url,
    },
  ];
}

function normalizeFormats(
  formats: MediaFormat[] | undefined,
  item: MediaItem,
): MediaFormat[] {
  const source = formats && formats.length > 0 ? formats : inferFormats(item);
  const seen = new Set<string>();
  const normalized: MediaFormat[] = [];

  for (const format of source) {
    const url = format.url ? normalizeHttpUrl(format.url) ?? undefined : undefined;
    const extension =
      format.extension || extensionFromUrl(url) || (item.kind === 'video' ? 'mp4' : 'jpg');
    const key = `${url ?? 'none'}:${extension}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push({
      ...format,
      extension,
      mimeType: format.mimeType || MIME_TYPES[extension] || 'application/octet-stream',
      url,
      kind: format.kind ?? item.kind,
      quality: format.quality ?? 'source',
    });
  }

  return normalized;
}

export function enrichMediaItem(
  platform: PlatformId,
  item: MediaItem,
  context: ExtractContext,
  account: AccountIdentity | null,
  pageType: PageType,
  blocking: boolean,
): MediaItem {
  const downloadable = !blocking && item.downloadable && isHttpUrl(item.url);
  const formats = downloadable ? normalizeFormats(item.formats, item) : [];
  const postId = item.postId ?? postIdFromUrl(platform, context.url);
  const sourcePageUrl =
    item.sourcePageUrl ?? item.postUrl ?? context.url.toString();

  return {
    ...item,
    id: item.id || createMediaId(platform, item.url),
    platform,
    author: item.author ?? account?.username ?? account?.displayName,
    account: item.account ?? account ?? undefined,
    postId,
    publishedAt: item.publishedAt ?? metaPublishedAt(context.document),
    sourcePageUrl,
    postUrl: item.postUrl ?? sourcePageUrl,
    pageType,
    formats,
    downloadable,
    unsupportedReason: blocking
      ? 'Restricted content — MediaVault does not bypass access controls.'
      : item.unsupportedReason,
    downloadStatus: blocking
      ? 'restricted'
      : item.downloadStatus ?? (downloadable ? 'available' : 'unsupported'),
  };
}

export function buildDownloadOptions(item: MediaItem): DownloadOption[] {
  if (item.downloadStatus && item.downloadStatus !== 'available') {
    return [];
  }

  if (!item.downloadable || !isHttpUrl(item.url)) {
    return [];
  }

  const formats = normalizeFormats(item.formats, item).filter(
    (format) => Boolean(format.url) && isHttpUrl(format.url),
  );

  const fallback = formats.length > 0 ? formats : inferFormats(item);

  return fallback.map((format, index) => ({
    ...format,
    isDefault: index === 0,
  }));
}
