import type { DownloadStatus } from './history';
import type { MediaItem, MediaKind } from './media';
import type { PageType } from './page';
import type { PlatformId } from './platform';

export type UiDataMode = 'live' | 'demo';

export type PageKind = PageType | 'photo';

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
  paused?: boolean;
  thumbnailUrl?: string;
  sizeLabel?: string;
  outputLabel?: string;
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
