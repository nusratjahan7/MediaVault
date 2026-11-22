import { cancelQueuedDownload, enqueueDownloads } from '@/downloads/queue';
import { downloadService } from '@/downloads/service';
import type { EnqueueResult } from '@/types/download';
import type {
  CancelDownloadRequest,
  DownloadItemsRequest,
  RetryDownloadRequest,
} from '@/types/messages';
import { AppError } from '@/utils/errors';

export async function handleDownloadItems({
  items,
}: DownloadItemsRequest): Promise<EnqueueResult> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('INVALID_INPUT', 'Select at least one media item to download.');
  }

  return enqueueDownloads(items);
}

export async function handleCancelDownload({
  historyId,
}: CancelDownloadRequest): Promise<{ cancelled: boolean }> {
  if (!historyId) {
    throw new AppError('INVALID_INPUT', 'A download id is required.');
  }

  return { cancelled: await cancelQueuedDownload(historyId) };
}

export async function handleRetryDownload({
  historyId,
}: RetryDownloadRequest): Promise<{ retried: boolean }> {
  if (!historyId) {
    throw new AppError('INVALID_INPUT', 'A download id is required.');
  }

  return { retried: await downloadService.retry(historyId) };
}
