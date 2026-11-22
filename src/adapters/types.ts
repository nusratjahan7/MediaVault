import type {
  DownloadOption,
  MediaItem,
  ScanLimitation,
} from '@/types/media';
import type { AccountIdentity, PageType, PlatformDetection } from '@/types/page';
import type { PlatformId } from '@/types/platform';
import type { RelationshipDiscovery } from '@/types/relationship';
import type { HighlightMedia, StoryMedia } from '@/types/story';

export interface ExtractContext {
  document: Document;
  url: URL;
}

export interface ExtractResult {
  items: MediaItem[];
  limitations: ScanLimitation[];
}

export interface AdapterDiscovery extends ExtractResult {
  platform: PlatformId;
  pageType: PageType;
  account: AccountIdentity | null;
}

export interface PlatformAdapter {
  readonly id: PlatformId;
  readonly label: string;

  /** Whether this adapter owns the given URL. */
  matches(url: URL): boolean;

  /** Structured platform detection for the current URL. */
  detectPlatform(url: URL): PlatformDetection;

  /** Detect the platform-specific page type from the URL and rendered page. */
  detectPageType(context: ExtractContext): PageType;

  /** Identify the visible author/page account without reading sessions or credentials. */
  identifyAccount(context: ExtractContext): AccountIdentity | null;

  /** Discover accessible media and normalize it with permitted metadata. */
  discoverMedia(context: ExtractContext): AdapterDiscovery;

  /** Return only the normalized media metadata for the current page. */
  extractMetadata(context: ExtractContext): MediaItem[];

  /** Discover accessible stories on the current story page. */
  discoverStories?(
    context: ExtractContext,
    discovery: AdapterDiscovery,
  ): StoryMedia[];

  /** Discover accessible highlights, their covers, and loaded highlight media. */
  discoverHighlights?(
    context: ExtractContext,
    discovery: AdapterDiscovery,
  ): HighlightMedia[];

  /** Discover the visible followers/following rows on an authorized page. */
  discoverRelationships?(context: ExtractContext): RelationshipDiscovery | null;

  /** Return the download formats the platform exposes for one item. */
  getDownloadOptions(item: MediaItem): DownloadOption[];

  /** Backwards-compatible extraction result used by the content scanner. */
  extract(context: ExtractContext): ExtractResult;
}
