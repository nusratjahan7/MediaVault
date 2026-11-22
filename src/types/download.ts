import type { DownloadStatus } from './history';

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
