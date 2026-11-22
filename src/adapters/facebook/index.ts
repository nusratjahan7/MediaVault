import { PLATFORM_META } from '@/constants';
import type { AccountIdentity, PageType } from '@/types/page';
import { matchesAnyHost } from '@/utils/url';
import { BasePlatformAdapter } from '../base-adapter';
import type { ExtractContext, ExtractResult } from '../types';
import type { HighlightMedia, StoryMedia } from '@/types/story';
import { identifyFacebookAccount } from './account';
import { extractFacebook } from './extract';
import { detectFacebookPageType } from './page-type';
import {
  discoverFacebookHighlights,
  discoverFacebookStories,
} from './stories';

export class FacebookAdapter extends BasePlatformAdapter {
  readonly id = 'facebook' as const;
  readonly label = 'Facebook';

  matches(url: URL): boolean {
    return matchesAnyHost(url, PLATFORM_META.facebook.hostnames);
  }

  detectPageType({ url }: ExtractContext): PageType {
    return detectFacebookPageType(url);
  }

  identifyAccount({ document }: ExtractContext): AccountIdentity | null {
    return identifyFacebookAccount(document);
  }

  discoverStories(
    context: ExtractContext,
    discovery: ExtractResult & {
      platform: 'facebook';
      pageType: PageType;
      account: AccountIdentity | null;
    },
  ): StoryMedia[] {
    return discoverFacebookStories(context, discovery);
  }

  discoverHighlights(
    context: ExtractContext,
    discovery: ExtractResult & {
      platform: 'facebook';
      pageType: PageType;
      account: AccountIdentity | null;
    },
  ): HighlightMedia[] {
    return discoverFacebookHighlights(context, discovery);
  }

  protected discoverRawMedia(context: ExtractContext): ExtractResult {
    return extractFacebook(context);
  }
}

export const facebookAdapter = new FacebookAdapter();
