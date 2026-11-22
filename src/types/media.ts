import type { AccountIdentity, PageType } from './page';
import type { PlatformId } from './platform';
import type { HighlightMedia, StoryMedia } from './story';

export type MediaKind = 'image' | 'video';

export type MediaDownloadStatus = 'available' | 'unsupported' | 'restricted' | 'unknown';

export type MediaQuality = 'source' | 'hd' | 'sd' | 'unknown';

export interface MediaFormat {
  id: string;
  label: string;
  extension: string;
  mimeType: string;
  kind: MediaKind;
  quality?: MediaQuality;
  url?: string;
}

export interface DownloadOption extends MediaFormat {
  isDefault: boolean;
}

export type LimitationCode =
  | 'unsupported-page'
  | 'permission-required'
  | 'private-content'
  | 'login-required'
  | 'blob-video'
  | 'drm-protected'
  | 'lazy-loaded'
  | 'signed-url-expiry'
  | 'no-media'
  | 'partial-extraction'
  | 'unsupported-media'
  | 'story-expired';

export type LimitationSeverity = 'info' | 'warning' | 'blocking';

export interface ScanLimitation {
  code: LimitationCode;
  message: string;
  severity: LimitationSeverity;
}

export interface MediaItem {
  id: string;
  platform: PlatformId;
  kind: MediaKind;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  postUrl?: string;
  author?: string;
  caption?: string;
  filenameHint?: string;
  downloadable: boolean;
  unsupportedReason?: string;
  postId?: string;
  publishedAt?: number;
  sourcePageUrl?: string;
  pageType?: PageType;
  formats?: MediaFormat[];
  downloadStatus?: MediaDownloadStatus;
  account?: AccountIdentity;
  location?: string;
  index?: number;
  sidecar?: 'thumbnail' | 'caption' | 'metadata';
  collectionType?: 'story' | 'highlight' | 'album';
  collectionTitle?: string;
}

export interface ScanResult {
  platform: PlatformId;
  pageUrl: string;
  scannedAt: number;
  items: MediaItem[];
  limitations: ScanLimitation[];
  pageType?: PageType;
  account?: AccountIdentity | null;
  stories?: StoryMedia[];
  highlights?: HighlightMedia[];
}
