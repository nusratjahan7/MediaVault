import type { PlatformId } from './platform';

export type MediaKind = 'image' | 'video';

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
  | 'unsupported-media';

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
}

export interface ScanResult {
  platform: PlatformId;
  pageUrl: string;
  scannedAt: number;
  items: MediaItem[];
  limitations: ScanLimitation[];
}
