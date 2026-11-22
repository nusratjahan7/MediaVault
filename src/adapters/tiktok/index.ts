import { PLATFORM_META } from '@/constants';
import type { AccountIdentity, PageType } from '@/types/page';
import { matchesAnyHost } from '@/utils/url';
import { BasePlatformAdapter } from '../base-adapter';
import type { ExtractContext, ExtractResult } from '../types';
import { identifyTikTokAccount } from './account';
import { extractTikTok } from './extract';
import { detectTikTokPageType } from './page-type';

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

  protected discoverRawMedia(context: ExtractContext): ExtractResult {
    return extractTikTok(context);
  }
}

export const tiktokAdapter = new TikTokAdapter();
