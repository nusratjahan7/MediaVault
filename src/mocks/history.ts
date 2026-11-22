import type { HistoryEntry } from '@/types/history';
import type { MediaItem } from '@/types/media';
import { MOCK_MEDIA } from './media';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const NOW = Date.now();

function filenameFor(item: MediaItem): string {
  const extension = item.kind === 'video' ? 'mp4' : 'jpg';
  return `MediaVault/${item.platform}/${item.platform}-${item.author ?? 'preview'}-${item.id.slice(-8)}.${extension}`;
}

function entry(
  id: string,
  item: MediaItem,
  status: HistoryEntry['status'],
  ago: number,
  overrides: Partial<HistoryEntry> = {},
): HistoryEntry {
  return {
    id,
    item: { ...item },
    filename: filenameFor(item),
    status,
    createdAt: NOW - ago,
    updatedAt: NOW - ago + 12_000,
    ...overrides,
  };
}

const instagram = MOCK_MEDIA.instagram;
const facebook = MOCK_MEDIA.facebook;
const tiktok = MOCK_MEDIA.tiktok;

export const MOCK_HISTORY: HistoryEntry[] = [
  entry('preview-1', instagram[0]!, 'completed', 8 * MINUTE, {
    downloadId: 9001,
    bytesReceived: 24_800_000,
  }),
  entry('preview-2', tiktok[0]!, 'completed', 22 * MINUTE, {
    downloadId: 9002,
    bytesReceived: 12_400_000,
  }),
  entry('preview-3', facebook[0]!, 'downloading', 1 * MINUTE, {
    downloadId: 9003,
    bytesReceived: 2_100_000,
  }),
  entry('preview-4', instagram[1]!, 'queued', 20_000),
  entry('preview-5', facebook[1]!, 'failed', 3 * MINUTE, {
    error:
      'The media URL could not be reached. It may have expired — reload the page and scan again.',
  }),
  entry('preview-6', tiktok[2]!, 'interrupted', 1 * HOUR, {
    error: 'The download was interrupted when MediaVault restarted.',
  }),
  entry('preview-7', instagram[2]!, 'completed', 26 * HOUR, {
    downloadId: 9004,
    bytesReceived: 6_300_000,
  }),
  entry('preview-8', facebook[2]!, 'cancelled', 2 * HOUR),
];
