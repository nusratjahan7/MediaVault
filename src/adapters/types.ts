import type { MediaItem, ScanLimitation } from '@/types/media';
import type { PlatformId } from '@/types/platform';

export interface ExtractContext {
  document: Document;
  url: URL;
}

export interface ExtractResult {
  items: MediaItem[];
  limitations: ScanLimitation[];
}

export interface PlatformAdapter {
  readonly id: PlatformId;
  matches(url: URL): boolean;
  extract(context: ExtractContext): ExtractResult;
}
