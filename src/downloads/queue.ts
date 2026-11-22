import { DOWNLOAD_CONCURRENCY } from '@/constants';
import { broadcastEvent } from '@/services/messaging';
import {
  addHistoryEntry,
  findHistoryByDownloadId,
  getActiveHistoryEntries,
  getHistoryEntry,
  pruneHistory,
  updateHistoryEntry,
} from '@/storage/history';
import { getSettings } from '@/storage/settings';
import type { DownloadStatus, HistoryEntry } from '@/types/history';
import type { EnqueueResult } from '@/types/download';
import type { MediaItem } from '@/types/media';
import { getErrorMessage, isAppError } from '@/utils/errors';
import { createId } from '@/utils/id';
import { isHttpUrl } from '@/utils/url';
import { logger } from '@/utils/logger';
import {
  cancelDownload,
  describeDownloadError,
  getDownload,
  onDownloadChanged,
  startDownload,
} from './client';
import { buildDownloadPath } from './filename';

interface QueueJob {
  id: string;
  item: MediaItem;
  filename: string;
  persist: boolean;
  status: DownloadStatus;
  downloadId?: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const pendingQueue: QueueJob[] = [];
const jobs = new Map<string, QueueJob>();
const jobIdByDownloadId = new Map<number, string>();
const waiters = new Map<string, () => void>();

let activeCount = 0;
let listenerAttached = false;
let initPromise: Promise<void> | null = null;

function isCancelled(job: QueueJob): boolean {
  return job.status === 'cancelled';
}

function toHistoryEntry(job: QueueJob): HistoryEntry {
  return {
    id: job.id,
    item: job.item,
    filename: job.filename,
    status: job.status,
    downloadId: job.downloadId,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

async function persistJob(job: QueueJob): Promise<void> {
  if (!job.persist) {
    return;
  }

  try {
    await updateHistoryEntry(job.id, {
      status: job.status,
      downloadId: job.downloadId,
      error: job.error,
      updatedAt: job.updatedAt,
    });
  } catch (error) {
    logger.warn('Failed to persist download history.', getErrorMessage(error));
  }
}

function broadcastJob(job: QueueJob): void {
  broadcastEvent({ type: 'DOWNLOADS_UPDATED', entries: [toHistoryEntry(job)] });
}

function resolveWaiter(id: string): void {
  const resolve = waiters.get(id);
  if (!resolve) {
    return;
  }

  waiters.delete(id);
  resolve();
}

function waitForJob(id: string): Promise<void> {
  return new Promise<void>((resolve) => {
    waiters.set(id, resolve);
  });
}

async function pruneIfNeeded(): Promise<void> {
  try {
    const settings = await getSettings();
    if (settings.historyEnabled) {
      await pruneHistory(settings.maxHistoryEntries);
    }
  } catch (error) {
    logger.warn('Failed to prune download history.', getErrorMessage(error));
  }
}

async function finishJob(
  job: QueueJob,
  status: Extract<DownloadStatus, 'completed' | 'failed'>,
  errorCode?: string,
): Promise<void> {
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return;
  }

  job.status = status;
  job.error = status === 'failed' ? describeDownloadError(errorCode) : undefined;
  job.updatedAt = Date.now();

  await persistJob(job);
  broadcastJob(job);
  resolveWaiter(job.id);
}

async function runJob(job: QueueJob): Promise<void> {
  job.status = 'downloading';
  job.updatedAt = Date.now();
  await persistJob(job);

  if (isCancelled(job)) {
    return;
  }

  broadcastJob(job);

  try {
    const downloadId = await startDownload({
      url: job.item.url,
      filename: job.filename,
      conflictAction: 'uniquify',
      saveAs: false,
    });

    if (isCancelled(job)) {
      await cancelDownload(downloadId);
      return;
    }

    job.downloadId = downloadId;
    jobIdByDownloadId.set(downloadId, job.id);
    await persistJob(job);

    const current = await getDownload(downloadId);
    if (current?.state === 'complete') {
      await finishJob(job, 'completed');
      return;
    }

    if (current?.state === 'interrupted') {
      await finishJob(job, 'failed', current.error ?? undefined);
      return;
    }

    await waitForJob(job.id);
  } catch (error) {
    if (isCancelled(job)) {
      return;
    }

    job.status = 'failed';
    job.error = isAppError(error)
      ? error.message
      : getErrorMessage(error) ||
        'Chrome could not start this download. Reload the page and scan again.';
    job.updatedAt = Date.now();
    await persistJob(job);
    broadcastJob(job);
    resolveWaiter(job.id);
    logger.warn('Download failed to start.', job.error);
  } finally {
    if (job.downloadId !== undefined) {
      jobIdByDownloadId.delete(job.downloadId);
    }
    jobs.delete(job.id);
    waiters.delete(job.id);
    await pruneIfNeeded();
  }
}

function pump(): void {
  while (activeCount < DOWNLOAD_CONCURRENCY) {
    const job = pendingQueue.shift();
    if (!job) {
      return;
    }

    activeCount += 1;
    void runJob(job).finally(() => {
      activeCount -= 1;
      pump();
    });
  }
}

async function handleDownloadDelta(delta: chrome.downloads.DownloadDelta): Promise<void> {
  const state = delta.state?.current;
  const jobId = jobIdByDownloadId.get(delta.id);
  const job = jobId ? jobs.get(jobId) : undefined;

  if (job) {
    if (state === 'complete') {
      await finishJob(job, 'completed');
    } else if (state === 'interrupted') {
      await finishJob(job, 'failed', delta.error?.current);
    }
    return;
  }

  if (state !== 'complete' && state !== 'interrupted') {
    return;
  }

  const entry = await findHistoryByDownloadId(delta.id);
  if (!entry || entry.status === 'completed' || entry.status === 'failed') {
    return;
  }

  const updated = await updateHistoryEntry(entry.id, {
    status: state === 'complete' ? 'completed' : 'failed',
    error: state === 'interrupted' ? describeDownloadError(delta.error?.current) : undefined,
    updatedAt: Date.now(),
  });

  if (updated) {
    broadcastEvent({ type: 'DOWNLOADS_UPDATED', entries: [updated] });
  }
}

function ensureDownloadListener(): void {
  if (listenerAttached) {
    return;
  }

  listenerAttached = true;
  onDownloadChanged((delta) => {
    void handleDownloadDelta(delta);
  });
}

async function reconcileActiveDownloads(): Promise<void> {
  const activeEntries = await getActiveHistoryEntries();

  for (const entry of activeEntries) {
    if (entry.downloadId === undefined) {
      await updateHistoryEntry(entry.id, {
        status: 'interrupted',
        error: 'The download was interrupted when MediaVault restarted.',
        updatedAt: Date.now(),
      });
      continue;
    }

    const download = await getDownload(entry.downloadId);
    if (!download) {
      await updateHistoryEntry(entry.id, {
        status: 'interrupted',
        error: 'The download could not be found after MediaVault restarted.',
        updatedAt: Date.now(),
      });
      continue;
    }

    if (download.state === 'complete') {
      await updateHistoryEntry(entry.id, { status: 'completed', updatedAt: Date.now() });
    } else if (download.state === 'interrupted') {
      await updateHistoryEntry(entry.id, {
        status: 'failed',
        error: describeDownloadError(download.error ?? undefined),
        updatedAt: Date.now(),
      });
    }
  }
}

export function initDownloadQueue(): Promise<void> {
  ensureDownloadListener();

  initPromise ??= reconcileActiveDownloads().catch((error: unknown) => {
    logger.warn('Failed to reconcile downloads.', getErrorMessage(error));
  });

  return initPromise;
}

export async function enqueueDownloads(items: MediaItem[]): Promise<EnqueueResult> {
  ensureDownloadListener();

  const settings = await getSettings();
  const accepted: EnqueueResult['accepted'] = [];
  let skipped = 0;

  for (const item of items) {
    if (!item.downloadable || !isHttpUrl(item.url)) {
      skipped += 1;
      continue;
    }

    const now = Date.now();
    const id = createId('dl');
    const filename = buildDownloadPath(item, settings);
    const job: QueueJob = {
      id,
      item,
      filename,
      persist: settings.historyEnabled,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    };

    jobs.set(id, job);
    pendingQueue.push(job);

    if (job.persist) {
      try {
        await addHistoryEntry(toHistoryEntry(job));
      } catch (error) {
        logger.warn('Failed to save download history.', getErrorMessage(error));
        job.persist = false;
      }
    }

    accepted.push({ id, itemId: item.id, filename, status: 'queued' });
    broadcastJob(job);
  }

  pump();
  return { accepted, skipped };
}

export async function cancelQueuedDownload(historyId: string): Promise<boolean> {
  const queuedIndex = pendingQueue.findIndex((job) => job.id === historyId);
  if (queuedIndex >= 0) {
    const [job] = pendingQueue.splice(queuedIndex, 1);
    if (job) {
      job.status = 'cancelled';
      job.updatedAt = Date.now();
      await persistJob(job);
      broadcastJob(job);
      resolveWaiter(job.id);
      jobs.delete(job.id);
      return true;
    }
  }

  const job = jobs.get(historyId);
  if (job) {
    if (job.downloadId !== undefined) {
      await cancelDownload(job.downloadId);
    }

    job.status = 'cancelled';
    job.updatedAt = Date.now();
    await persistJob(job);
    broadcastJob(job);
    resolveWaiter(job.id);
    return true;
  }

  const entry = await getHistoryEntry(historyId);
  if (!entry) {
    return false;
  }

  if (entry.downloadId !== undefined) {
    await cancelDownload(entry.downloadId);
  }

  const updated = await updateHistoryEntry(historyId, {
    status: 'cancelled',
    updatedAt: Date.now(),
  });

  if (updated) {
    broadcastEvent({ type: 'DOWNLOADS_UPDATED', entries: [updated] });
  }

  return true;
}

export function resetDownloadQueueForTests(): void {
  pendingQueue.length = 0;
  jobs.clear();
  jobIdByDownloadId.clear();
  waiters.clear();
  activeCount = 0;
  listenerAttached = false;
  initPromise = null;
}
