import type { DownloadStatus, HistoryEntry } from './history';

export interface DashboardSnapshot {
  entries: HistoryEntry[];
  counts: Record<DownloadStatus, number>;
  completedFiles: number;
  completedBytes: number;
  completedWithBytes: number;
}
