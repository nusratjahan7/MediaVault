import { PLATFORM_META } from '@/constants';
import type { AccountIdentity, PageType } from '@/types/page';
import { matchesAnyHost } from '@/utils/url';
import { BasePlatformAdapter } from '../base-adapter';
import type { ExtractContext, ExtractResult } from '../types';
import type { HighlightMedia, StoryMedia } from '@/types/story';
import { identifyInstagramAccount } from './account';
import { extractInstagram } from './extract';
import { detectInstagramPageType } from './page-type';
import type { RelationshipDiscovery } from '@/types/relationship';
import { discoverInstagramRelationships } from './relationships';
import {
  discoverInstagramHighlights,
  discoverInstagramStories,
} from './stories';

export class InstagramAdapter extends BasePlatformAdapter {
  readonly id = 'instagram' as const;
  readonly label = 'Instagram';

  matches(url: URL): boolean {
    return matchesAnyHost(url, PLATFORM_META.instagram.hostnames);
  }

  detectPageType({ url }: ExtractContext): PageType {
    return detectInstagramPageType(url);
  }

  identifyAccount({ document }: ExtractContext): AccountIdentity | null {
    return identifyInstagramAccount(document);
  }

  discoverStories(
    context: ExtractContext,
    discovery: ExtractResult & {
      platform: 'instagram';
      pageType: PageType;
      account: AccountIdentity | null;
    },
  ): StoryMedia[] {
    return discoverInstagramStories(context, discovery);
  }

  discoverHighlights(
    context: ExtractContext,
    discovery: ExtractResult & {
      platform: 'instagram';
      pageType: PageType;
      account: AccountIdentity | null;
    },
  ): HighlightMedia[] {
    return discoverInstagramHighlights(context, discovery);
  }

  discoverRelationships(context: ExtractContext): RelationshipDiscovery | null {
    return discoverInstagramRelationships(context);
  }

  protected discoverRawMedia(context: ExtractContext): ExtractResult {
    return extractInstagram(context);
  }
}

export const instagramAdapter = new InstagramAdapter();
