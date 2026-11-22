import type { DownloadStatus } from '@/types/history';

export type StatusTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export const STATUS_META: Record<
  DownloadStatus,
  { label: string; tone: StatusTone; active: boolean }
> = {
  queued: { label: 'Queued', tone: 'neutral', active: true },
  downloading: { label: 'Downloading', tone: 'accent', active: true },
  completed: { label: 'Saved', tone: 'success', active: false },
  failed: { label: 'Failed', tone: 'danger', active: false },
  interrupted: { label: 'Interrupted', tone: 'warning', active: false },
  cancelled: { label: 'Cancelled', tone: 'neutral', active: false },
};
