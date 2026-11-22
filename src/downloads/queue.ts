import type { EnqueueResult } from '@/types/download';
import type { MediaItem } from '@/types/media';
import { isHttpUrl } from '@/utils/url';
import {
  downloadService,
  downloadSourceFromMediaItem,
} from './service';

/**
 * Compatibility layer used by the background handlers and UI. The engine itself
 * lives in DownloadService; this keeps the existing single-media workflow while
 * allowing batch enqueue from the popup.
 */
export async function enqueueDownloads(items: MediaItem[]): Promise<EnqueueResult> {
  const accepted: EnqueueResult['accepted'] = [];
  let skipped = 0;

  for (const item of items) {
    if (!item.downloadable || !isHttpUrl(item.url)) {
      skipped += 1;
      continue;
    }

    try {
      const record = await downloadService.enqueue(
        downloadSourceFromMediaItem(item),
      );
      accepted.push({
        id: record.id,
        itemId: item.id,
        filename: record.filename,
        status: 'queued',
      });
    } catch {
      skipped += 1;
    }
  }

  downloadService.start();
  return { accepted, skipped };
}

export function cancelQueuedDownload(historyId: string): Promise<boolean> {
  return downloadService.cancel(historyId);
}

export function initDownloadQueue(): Promise<void> {
  return downloadService.init();
}

export function resetDownloadQueueForTests(): void {
  downloadService.resetForTests();
}
