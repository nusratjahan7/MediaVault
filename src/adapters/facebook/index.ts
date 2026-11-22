import { PLATFORM_META } from '@/constants';
import type { AccountIdentity, PageType } from '@/types/page';
import { matchesAnyHost } from '@/utils/url';
import { BasePlatformAdapter } from '../base-adapter';
import type { ExtractContext, ExtractResult } from '../types';
import { identifyFacebookAccount } from './account';
import { extractFacebook } from './extract';
import { detectFacebookPageType } from './page-type';

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

  protected discoverRawMedia(context: ExtractContext): ExtractResult {
    return extractFacebook(context);
  }
}

export const facebookAdapter = new FacebookAdapter();
