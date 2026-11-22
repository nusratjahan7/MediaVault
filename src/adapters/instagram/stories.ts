import type { HighlightMedia, StoryMedia } from '@/types/story';
import { normalizeHttpUrl } from '@/utils/url';
import {
  buildHighlightMedia,
  buildStoryMedia,
  extractHighlightCover,
  extractHighlightTitle,
} from '../shared/stories';
import { createMediaItem, detectExpiredStory, imageSource } from '../shared/dom';
import { postIdFromUrl } from '../shared/metadata';
import type { AdapterDiscovery, ExtractContext } from '../types';

function cleanHighlightTitle(raw: string, fallback: string): string {
  const match = raw.match(/highlight[:\s-]+(.+)$/i);
  const cleaned = (match?.[1] ?? raw).replace(/\s+/g, ' ').trim();
  return cleaned && !/^highlight$/i.test(cleaned) ? cleaned.slice(0, 80) : fallback;
}

export function discoverInstagramStories(
  context: ExtractContext,
  discovery: AdapterDiscovery,
): StoryMedia[] {
  if (discovery.pageType === 'story') {
    if (discovery.items.length === 0) {
      return [];
    }

    return buildStoryMedia(
      'instagram',
      discovery.account,
      discovery.items,
      context.url.toString(),
      context.document,
      {
        expired: detectExpiredStory(context.document),
        storyId: postIdFromUrl('instagram', context.url),
      },
    );
  }

  if (discovery.pageType !== 'profile') {
    return [];
  }

  const stories: StoryMedia[] = [];
  const seen = new Set<string>();

  for (const anchor of context.document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/stories/"]',
  )) {
    const href = normalizeHttpUrl(anchor.getAttribute('href'), context.url.href);
    if (!href || seen.has(href)) {
      continue;
    }

    const parsed = new URL(href);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (
      segments[0] !== 'stories' ||
      !segments[1] ||
      segments[1] === 'highlights' ||
      segments.length > 3
    ) {
      continue;
    }

    seen.add(href);

    const username = segments[1];
    const image = anchor.querySelector<HTMLImageElement>('img');
    const coverUrl = image ? imageSource(image, context.url.href) : undefined;
    const account = discovery.account ?? {
      platform: 'instagram' as const,
      username,
      profileUrl: `https://www.instagram.com/${username}/`,
    };
    const placeholder = createMediaItem('instagram', 'image', href, {
      thumbnailUrl: coverUrl,
      author: username,
      caption: 'Active story',
      postUrl: href,
      sourcePageUrl: href,
      downloadable: false,
      unsupportedReason:
        'Open this story to load its media and expiration information.',
    });

    stories.push(
      ...buildStoryMedia(
        'instagram',
        account,
        [placeholder],
        href,
        context.document,
        {
          disableTiming: true,
          storyId: parsed.pathname,
        },
      ),
    );
  }

  return stories;
}

export function discoverInstagramHighlights(
  context: ExtractContext,
  discovery: AdapterDiscovery,
): HighlightMedia[] {
  if (discovery.pageType === 'highlight') {
    const title = extractHighlightTitle(context.document, 'Highlight');
    const coverUrl = extractHighlightCover(context.document, context.url);

    for (const item of discovery.items) {
      item.collectionType = 'highlight';
      item.collectionTitle = title;
    }

    return [
      buildHighlightMedia({
        platform: 'instagram',
        account: discovery.account,
        title,
        items: discovery.items,
        coverUrl,
        sourcePageUrl: context.url.toString(),
        idSuffix: postIdFromUrl('instagram', context.url) ?? title,
      }),
    ];
  }

  if (discovery.pageType !== 'profile') {
    return [];
  }

  const highlights: HighlightMedia[] = [];
  const seen = new Set<string>();
  const anchors = context.document.querySelectorAll<HTMLAnchorElement>(
    'main a[href*="/stories/highlights/"], a[href*="/stories/highlights/"]',
  );

  for (const anchor of anchors) {
    const href = normalizeHttpUrl(anchor.getAttribute('href'), context.url.href);
    if (!href || seen.has(href)) {
      continue;
    }

    seen.add(href);

    const image = anchor.querySelector<HTMLImageElement>('img');
    const coverUrl = image ? imageSource(image, context.url.href) : undefined;
    const ariaLabel = anchor.getAttribute('aria-label') ?? '';
    const alt = image?.alt ?? '';
    const title = cleanHighlightTitle(
      ariaLabel || alt || anchor.textContent?.trim() || '',
      'Highlight',
    );
    const id = postIdFromUrl('instagram', new URL(href)) ?? href;

    highlights.push(
      buildHighlightMedia({
        platform: 'instagram',
        account: discovery.account,
        title,
        items: [],
        coverUrl,
        sourcePageUrl: href,
        idSuffix: id,
      }),
    );
  }

  return highlights;
}
