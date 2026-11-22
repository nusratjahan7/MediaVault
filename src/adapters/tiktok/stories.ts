import type { HighlightMedia, StoryMedia } from '@/types/story';
import { buildStoryMedia } from '../shared/stories';
import { detectExpiredStory } from '../shared/dom';
import { postIdFromUrl } from '../shared/metadata';
import type { AdapterDiscovery, ExtractContext } from '../types';

export function discoverTikTokStories(
  context: ExtractContext,
  discovery: AdapterDiscovery,
): StoryMedia[] {
  if (discovery.pageType !== 'story' || discovery.items.length === 0) {
    return [];
  }

  return buildStoryMedia(
    'tiktok',
    discovery.account,
    discovery.items,
    context.url.toString(),
    context.document,
    {
      expired: detectExpiredStory(context.document),
      storyId: postIdFromUrl('tiktok', context.url),
    },
  );
}

export function discoverTikTokHighlights(): HighlightMedia[] {
  // TikTok does not expose a permitted highlights surface in its public page data.
  return [];
}
