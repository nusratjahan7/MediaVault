import type { MediaItem } from '@/types/media';
import type { QueuePreviewItem } from '@/types/ui';
import { createId } from '@/utils/id';
import { MOCK_THUMBNAILS } from './mock-thumbnails';

function basename(filename: string): string {
  return filename.split('/').pop() ?? filename;
}

function extensionFor(item: MediaItem): string {
  return item.kind === 'video' ? 'mp4' : 'jpg';
}

export function createMockQueueItemsFromMedia(media: MediaItem[]): QueuePreviewItem[] {
  return media
    .filter((item) => item.downloadable)
    .map((item) => ({
      id: createId('mockq'),
      platform: item.platform,
      kind: item.kind,
      filename: `${item.platform}-${item.author ?? 'preview'}-${item.id.slice(-8)}.${extensionFor(item)}`,
      status: 'queued',
      progress: 0,
      thumbnailUrl: item.thumbnailUrl,
      sizeLabel: item.kind === 'video' ? '18.6 MB' : '4.2 MB',
      createdAt: Date.now(),
    }));
}

export function createInitialMockQueue(): QueuePreviewItem[] {
  return [
    {
      id: createId('mockq'),
      platform: 'facebook',
      kind: 'image',
      filename: basename(
        'MediaVault/facebook/facebook-atlasfilms-lake-house.jpg',
      ),
      status: 'downloading',
      progress: 62,
      thumbnailUrl: MOCK_THUMBNAILS.lakeHouse,
      sizeLabel: '6.8 MB',
      createdAt: Date.now() - 40_000,
    },
    {
      id: createId('mockq'),
      platform: 'tiktok',
      kind: 'video',
      filename: 'tiktok-studio.north-lighting-tricks.mp4',
      status: 'downloading',
      progress: 24,
      thumbnailUrl: MOCK_THUMBNAILS.tiktokVideo,
      sizeLabel: '12.4 MB',
      createdAt: Date.now() - 20_000,
    },
    {
      id: createId('mockq'),
      platform: 'instagram',
      kind: 'image',
      filename: 'instagram-studio.north-golden-hour.jpg',
      status: 'queued',
      progress: 0,
      thumbnailUrl: MOCK_THUMBNAILS.goldenHour,
      sizeLabel: '4.2 MB',
      createdAt: Date.now(),
    },
  ];
}

export function advanceMockQueue(items: QueuePreviewItem[]): QueuePreviewItem[] {
  let changed = false;

  const next = items.map((item) => {
    if (item.status === 'queued') {
      changed = true;
      return { ...item, status: 'downloading' as const, progress: 6 };
    }

    if (item.status === 'downloading') {
      changed = true;
      const progress = Math.min(100, (item.progress ?? 0) + 18);
      return progress >= 100
        ? { ...item, status: 'completed' as const, progress: 100 }
        : { ...item, progress };
    }

    return item;
  });

  return changed ? next : items;
}
