import type { DownloadOutputInfo } from './download';
import type { MediaItem } from './media';
import type { PlatformId } from './platform';

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted';

export interface HistoryEntry {
  id: string;
  item: MediaItem;
  filename: string;
  status: DownloadStatus;
  downloadId?: number;
  bytesReceived?: number;
  totalBytes?: number;
  paused?: boolean;
  error?: string;
  output?: DownloadOutputInfo;
  createdAt: number;
  updatedAt: number;
}

export interface HistoryQuery {
  platform?: PlatformId | 'all';
  status?: DownloadStatus | 'all';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface HistoryPage {
  entries: HistoryEntry[];
  total: number;
  hasMore: boolean;
}
