import type { DownloadOption, MediaItem, ScanLimitation } from '@/types/media';
import type { AccountIdentity, PageType, PlatformDetection } from '@/types/page';
import type { PlatformId } from '@/types/platform';
import { isHttpUrl } from '@/utils/url';
import { dedupeMediaItems, detectExpiredStory } from './shared/dom';
import { buildDownloadOptions, enrichMediaItem } from './shared/metadata';
import type {
  AdapterDiscovery,
  ExtractContext,
  ExtractResult,
  PlatformAdapter,
} from './types';

const EXTRACTION_FAILED: ScanLimitation = {
  code: 'partial-extraction',
  severity: 'warning',
  message:
    'MediaVault could not read this page. The platform may have changed its layout or restricted the content.',
};

export abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract readonly id: PlatformId;
  abstract readonly label: string;

  abstract matches(url: URL): boolean;
  abstract detectPageType(context: ExtractContext): PageType;
  abstract identifyAccount(context: ExtractContext): AccountIdentity | null;

  protected abstract discoverRawMedia(context: ExtractContext): ExtractResult;

  detectPlatform(url: URL): PlatformDetection {
    return {
      platform: this.id,
      supported: this.matches(url),
      url: url.toString(),
    };
  }

  discoverMedia(context: ExtractContext): AdapterDiscovery {
    const pageType = this.safePageType(context);
    const account = this.safeAccount(context);

    let raw: ExtractResult;
    try {
      raw = this.discoverRawMedia(context);
    } catch {
      raw = { items: [], limitations: [EXTRACTION_FAILED] };
    }

    if (
      (pageType === 'story' || pageType === 'highlight') &&
      detectExpiredStory(context.document) &&
      !raw.limitations.some((limitation) => limitation.code === 'story-expired')
    ) {
      raw.limitations.push({
        code: 'story-expired',
        severity: 'warning',
        message:
          'This story or highlight is no longer available or has expired. MediaVault cannot recover expired or deleted media.',
      });
    }

    const blocking = raw.limitations.some(
      (limitation) => limitation.severity === 'blocking',
    );

    const items = dedupeMediaItems(
      raw.items
        .map((item) =>
          enrichMediaItem(this.id, item, context, account, pageType, blocking),
        )
        .filter((item) => isHttpUrl(item.url)),
    );

    return {
      platform: this.id,
      pageType,
      account,
      items,
      limitations: raw.limitations,
    };
  }

  extractMetadata(context: ExtractContext): MediaItem[] {
    return this.discoverMedia(context).items;
  }

  getDownloadOptions(item: MediaItem): DownloadOption[] {
    return buildDownloadOptions(item);
  }

  extract(context: ExtractContext): ExtractResult {
    const discovery = this.discoverMedia(context);
    return {
      items: discovery.items,
      limitations: discovery.limitations,
    };
  }

  private safePageType(context: ExtractContext): PageType {
    try {
      return this.detectPageType(context);
    } catch {
      return 'unknown';
    }
  }

  private safeAccount(context: ExtractContext): AccountIdentity | null {
    try {
      return this.identifyAccount(context);
    } catch {
      return null;
    }
  }
}
