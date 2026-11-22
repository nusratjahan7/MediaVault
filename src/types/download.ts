import type { DownloadStatus } from './history';
import type {
  MediaDownloadStatus,
  MediaFormat,
  MediaKind,
  MediaQuality,
} from './media';
import type { PageType } from './page';
import type { PlatformId } from './platform';

export type DownloadState =
  | 'pending'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DownloadSidecar = 'thumbnail' | 'caption' | 'metadata';

export interface DownloadOutputInfo {
  extension: string;
  mimeType: string;
  quality: MediaQuality;
  label: string;
  converted: boolean;
  note?: string;
}

export interface DownloadSource {
  id: string;
  platform: PlatformId;
  kind: MediaKind;
  url: string;
  index?: number;
  location?: string;
  pageType?: PageType;
  sidecar?: DownloadSidecar;
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
  collectionType?: 'story' | 'highlight' | 'album';
  collectionTitle?: string;
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
  output?: DownloadOutputInfo;
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
  alreadyDownloaded: number;
}
