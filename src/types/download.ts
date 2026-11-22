import type { DownloadStatus } from './history';
import type {
  MediaDownloadStatus,
  MediaFormat,
  MediaKind,
} from './media';
import type { PlatformId } from './platform';

export type DownloadState =
  | 'pending'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DownloadSource {
  id: string;
  platform: PlatformId;
  kind: MediaKind;
  url: string;
  thumbnailUrl?: string;
  author?: string;
  caption?: string;
  postUrl?: string;
  postId?: string;
  publishedAt?: number;
  sourcePageUrl?: string;
  filenameHint?: string;
  formats?: MediaFormat[];
  downloadStatus?: MediaDownloadStatus;
}

export interface DownloadRecord {
  id: string;
  source: DownloadSource;
  state: DownloadState;
  filename: string;
  downloadId?: number;
  bytesReceived?: number;
  totalBytes?: number;
  /** 0–100, set only from bytes Chrome reports (or 100 after confirmation). */
  progress?: number;
  paused?: boolean;
  error?: string;
  attempts: number;
  createdAt: number;
  updatedAt: number;
}

export interface DownloadJobSummary {
  id: string;
  itemId: string;
  filename: string;
  status: DownloadStatus;
}

export interface EnqueueResult {
  accepted: DownloadJobSummary[];
  skipped: number;
}
