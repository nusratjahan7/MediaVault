import type { DownloadStatus } from './history';
import type { MediaItem, MediaKind } from './media';
import type { PlatformId } from './platform';

export type UiDataMode = 'live' | 'demo';

export type PageKind =
  | 'post'
  | 'reel'
  | 'video'
  | 'photo'
  | 'profile'
  | 'feed'
  | 'unknown';

export interface PageContext {
  platform: PlatformId;
  author?: string;
  accountName?: string;
  handle?: string;
  pageTitle: string;
  pageUrl?: string;
  pageKind: PageKind;
  mediaCount: number;
  capturedAt: number;
  mode: UiDataMode;
}

export interface PreviewAccount {
  id: string;
  platform: PlatformId;
  displayName: string;
  handle: string;
  accountType: 'Personal' | 'Creator' | 'Business' | 'Page';
  initials: string;
  accent: string;
  followersLabel: string;
}

export interface QueuePreviewItem {
  id: string;
  platform: PlatformId;
  kind: MediaKind;
  filename: string;
  status: DownloadStatus;
  progress?: number;
  thumbnailUrl?: string;
  sizeLabel?: string;
  error?: string;
  createdAt: number;
}

export interface QueuePreviewController {
  mode: UiDataMode;
  items: QueuePreviewItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void> | void;
  addMockMedia?: (items: MediaItem[]) => void;
  reset?: () => void;
}
