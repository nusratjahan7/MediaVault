import { PLATFORM_META } from '@/constants';
import type { AccountIdentity, PageType } from '@/types/page';
import { matchesAnyHost } from '@/utils/url';
import { BasePlatformAdapter } from '../base-adapter';
import type { ExtractContext, ExtractResult } from '../types';
import type { HighlightMedia, StoryMedia } from '@/types/story';
import { identifyTikTokAccount } from './account';
import { extractTikTok } from './extract';
import { detectTikTokPageType } from './page-type';
import type { RelationshipDiscovery } from '@/types/relationship';
import { discoverTikTokRelationships } from './relationships';
import { discoverTikTokHighlights, discoverTikTokStories } from './stories';

export class TikTokAdapter extends BasePlatformAdapter {
  readonly id = 'tiktok' as const;
  readonly label = 'TikTok';

  matches(url: URL): boolean {
    return matchesAnyHost(url, PLATFORM_META.tiktok.hostnames);
  }

  detectPageType({ url }: ExtractContext): PageType {
    return detectTikTokPageType(url);
  }

  identifyAccount({ document }: ExtractContext): AccountIdentity | null {
    return identifyTikTokAccount(document);
  }

  discoverStories(
    context: ExtractContext,
    discovery: ExtractResult & {
      platform: 'tiktok';
      pageType: PageType;
      account: AccountIdentity | null;
    },
  ): StoryMedia[] {
    return discoverTikTokStories(context, discovery);
  }

  discoverHighlights(): HighlightMedia[] {
    return discoverTikTokHighlights();
  }

  discoverRelationships(context: ExtractContext): RelationshipDiscovery | null {
    return discoverTikTokRelationships(context);
  }

  protected discoverRawMedia(context: ExtractContext): ExtractResult {
    return extractTikTok(context);
  }
}

export const tiktokAdapter = new TikTokAdapter();
