import type { HighlightMedia, StoryMedia } from '@/types/story';
import { normalizeHttpUrl } from '@/utils/url';
import {
  buildHighlightMedia,
  buildStoryMedia,
  extractHighlightCover,
  extractHighlightTitle,
} from '../shared/stories';
import { detectExpiredStory, imageSource } from '../shared/dom';
import { postIdFromUrl } from '../shared/metadata';
import type { AdapterDiscovery, ExtractContext } from '../types';

export function discoverFacebookStories(
  context: ExtractContext,
  discovery: AdapterDiscovery,
): StoryMedia[] {
  if (discovery.pageType !== 'story' || discovery.items.length === 0) {
    return [];
  }

  return buildStoryMedia(
    'facebook',
    discovery.account,
    discovery.items,
    context.url.toString(),
    context.document,
    {
      expired: detectExpiredStory(context.document),
      storyId: postIdFromUrl('facebook', context.url),
    },
  );
}

export function discoverFacebookHighlights(
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
        platform: 'facebook',
        account: discovery.account,
        title,
        items: discovery.items,
        coverUrl,
        sourcePageUrl: context.url.toString(),
        idSuffix: postIdFromUrl('facebook', context.url) ?? title,
      }),
    ];
  }

  if (discovery.pageType !== 'profile') {
    return [];
  }

  const highlights: HighlightMedia[] = [];
  const seen = new Set<string>();
  const anchors = context.document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/highlights/"]',
  );

  for (const anchor of anchors) {
    const href = normalizeHttpUrl(anchor.getAttribute('href'), context.url.href);
    if (!href || seen.has(href)) {
      continue;
    }

    seen.add(href);
    const image = anchor.querySelector<HTMLImageElement>('img');
    const coverUrl = image ? imageSource(image, context.url.href) : undefined;
    const title =
      anchor.getAttribute('aria-label')?.trim() ||
      image?.alt?.trim() ||
      'Highlight';

    highlights.push(
      buildHighlightMedia({
        platform: 'facebook',
        account: discovery.account,
        title,
        items: [],
        coverUrl,
        sourcePageUrl: href,
        idSuffix: postIdFromUrl('facebook', new URL(href)) ?? href,
      }),
    );
  }

  return highlights;
}
