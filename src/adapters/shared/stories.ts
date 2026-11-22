import type { MediaItem } from '@/types/media';
import type { AccountIdentity } from '@/types/page';
import type { PlatformId } from '@/types/platform';
import type { HighlightMedia, StoryMedia } from '@/types/story';
import { normalizeHttpUrl } from '@/utils/url';
import { createMediaItem, ogContent } from './dom';
import { metaPublishedAt } from './metadata';

export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export interface StoryTiming {
  postedAt?: number;
  expiresAt?: number;
  expired: boolean;
}

export function resolveStoryTiming(
  document: Document,
  items: MediaItem[],
): StoryTiming {
  const postedAt =
    items.find((item) => item.publishedAt !== undefined)?.publishedAt ??
    metaPublishedAt(document);
  const expiresAt =
    postedAt !== undefined ? postedAt + STORY_TTL_MS : undefined;
  const expired = expiresAt !== undefined ? expiresAt <= Date.now() : false;

  return { postedAt, expiresAt, expired };
}

export interface BuildStoriesOptions {
  expired?: boolean;
  storyId?: string;
  disableTiming?: boolean;
}

export function buildStoryMedia(
  platform: PlatformId,
  account: AccountIdentity | null,
  items: MediaItem[],
  sourcePageUrl: string,
  document: Document,
  options: BuildStoriesOptions = {},
): StoryMedia[] {
  const timing = options.disableTiming
    ? { expired: false as const }
    : resolveStoryTiming(document, items);
  const forcedExpired = Boolean(options.expired);

  return items.map((item) => {
    const expired = timing.expired || forcedExpired;
    const available = item.downloadable && !expired;
    const unavailableReason = expired
      ? 'This story has expired or is no longer available.'
      : !item.downloadable
        ? (item.unsupportedReason ??
          'This story did not expose a direct media file.')
        : undefined;

    return {
      id: `${platform}:story:${item.id}`,
      platform,
      account: item.account ?? account,
      item,
      storyId: options.storyId ?? item.postId,
      postedAt: item.publishedAt ?? timing.postedAt,
      expiresAt: timing.expiresAt,
      expired,
      available,
      unavailableReason,
      sourcePageUrl: item.sourcePageUrl ?? sourcePageUrl,
    };
  });
}

export function extractHighlightTitle(
  document: Document,
  fallback = 'Highlight',
): string {
  const generic = new Set([
    'instagram',
    'facebook',
    'tiktok',
    'highlights',
    'stories',
    'story',
    'highlight',
  ]);
  const headings = [
    ...document.querySelectorAll<HTMLElement>('h1, h2, [role="heading"]'),
  ]
    .map((node) => node.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(
      (text) =>
        text.length > 0 && text.length <= 80 && !generic.has(text.toLowerCase()),
    );

  if (headings[0]) {
    return headings[0];
  }

  const rawTitle = ogContent(document, 'og:title');
  const quoted = rawTitle?.match(/[“"]([^”"]{1,80})[”"]/)?.[1]?.trim();
  if (quoted) {
    return quoted;
  }

  const ogTitle = rawTitle
    ?.replace(/\s*[|•—–-]\s*(Instagram|Facebook|TikTok).*$/i, '')
    .trim();

  return ogTitle && ogTitle.length <= 80 && !generic.has(ogTitle.toLowerCase())
    ? ogTitle
    : fallback;
}

export function extractHighlightCover(
  document: Document,
  base: URL,
): string | undefined {
  return normalizeHttpUrl(ogContent(document, 'og:image'), base.href) ?? undefined;
}

export interface BuildHighlightInput {
  platform: PlatformId;
  account: AccountIdentity | null;
  title: string;
  items: MediaItem[];
  coverUrl?: string;
  sourcePageUrl: string;
  idSuffix?: string;
}

export function buildHighlightMedia(input: BuildHighlightInput): HighlightMedia {
  const title = input.title.trim() || 'Highlight';
  const items = input.items.map((item) => ({
    ...item,
    collectionType: 'highlight' as const,
    collectionTitle: title,
  }));

  const coverUrl = normalizeHttpUrl(input.coverUrl) ?? undefined;
  const cover = coverUrl
    ? createMediaItem(input.platform, 'image', coverUrl, {
        thumbnailUrl: coverUrl,
        author: input.account?.username ?? input.account?.displayName,
        caption: `Highlight cover · ${title}`,
        postUrl: input.sourcePageUrl,
        sourcePageUrl: input.sourcePageUrl,
        filenameHint: 'highlight-cover',
        collectionType: 'highlight',
        collectionTitle: title,
      })
    : undefined;

  const available = items.some((item) => item.downloadable);
  const unavailableReason =
    items.length === 0
      ? 'Open this highlight to load its media.'
      : available
        ? undefined
        : 'This highlight did not expose a direct media file.';

  return {
    id: `${input.platform}:highlight:${input.idSuffix ?? title}`,
    platform: input.platform,
    account: input.account,
    title,
    cover,
    items,
    sourcePageUrl: input.sourcePageUrl,
    available,
    unavailableReason,
  };
}
