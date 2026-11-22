import {
  DEFAULT_DOWNLOAD_CONCURRENCY,
  MAX_DOWNLOAD_CONCURRENCY,
  MIN_DOWNLOAD_CONCURRENCY,
} from '@/constants';
import { broadcastEvent } from '@/services/messaging';
import {
  addHistoryEntry,
  findHistoryByDownloadId,
  getActiveHistoryEntries,
  getHistoryEntry,
  hasCompletedMedia,
  pruneHistory,
  queryHistory,
  updateHistoryEntry,
} from '@/storage/history';
import { getSettings } from '@/storage/settings';
import type {
  DownloadOutputInfo,
  DownloadRecord,
  DownloadSource,
  DownloadState,
} from '@/types/download';
import type { DownloadStatus, HistoryEntry } from '@/types/history';
import type { MediaItem } from '@/types/media';
import { AppError, getErrorMessage, isAppError } from '@/utils/errors';
import { createId } from '@/utils/id';
import { logger } from '@/utils/logger';
import { isHttpUrl } from '@/utils/url';
import { sanitizeDownloadPath } from '@/utils/filename';
import {
  cancelDownload,
  describeDownloadError,
  getDownload,
  onDownloadChanged,
  pauseDownload,
  resumeDownload,
  startDownload,
} from './client';
import { buildDownloadPath } from './filename';
import { prepareDownloadOutput } from './output';

const PROGRESS_POLL_MS = 700;
const SESSION_HISTORY_LIMIT = 100;

interface InternalJob extends DownloadRecord {
  persist: boolean;
  persisted: boolean;
  lastPersistedAt: number;
  downloadUrl?: string;
}

function isTerminal(state: DownloadState): boolean {
  return state === 'completed' || state === 'failed' || state === 'cancelled';
}

function historyStatusFromState(state: DownloadState): DownloadStatus {
  switch (state) {
    case 'pending':
      return 'queued';
    case 'downloading':
      return 'downloading';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
  }
}

function stateFromHistoryStatus(status: DownloadStatus): DownloadState {
  switch (status) {
    case 'queued':
      return 'pending';
    case 'downloading':
      return 'downloading';
    case 'completed':
      return 'completed';
    case 'failed':
    case 'interrupted':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
  }
}

function progressFromDownload(
  download: chrome.downloads.DownloadItem,
): number | undefined {
  if (download.state === 'complete') {
    return 100;
  }

  if (download.totalBytes > 0) {
    return Math.min(
      99,
      Math.max(0, Math.round((download.bytesReceived / download.totalBytes) * 100)),
    );
  }

  return undefined;
}

export function downloadSourceFromMediaItem(item: MediaItem): DownloadSource {
  return {
    id: item.id,
    platform: item.platform,
    kind: item.kind,
    url: item.url,
    thumbnailUrl: item.thumbnailUrl,
    author: item.author,
    caption: item.caption,
    postUrl: item.postUrl,
    postId: item.postId,
    publishedAt: item.publishedAt,
    sourcePageUrl: item.sourcePageUrl,
    filenameHint: item.filenameHint,
    formats: item.formats,
    downloadStatus: item.downloadStatus,
    location: item.location,
    index: item.index,
    sidecar: item.sidecar,
    pageType: item.pageType,
    collectionType: item.collectionType,
    collectionTitle: item.collectionTitle,
  };
}

function sourceToMediaItem(source: DownloadSource): MediaItem {
  return {
    id: source.id,
    platform: source.platform,
    kind: source.kind,
    url: source.url,
    thumbnailUrl: source.thumbnailUrl,
    author: source.author,
    caption: source.caption,
    postUrl: source.postUrl,
    postId: source.postId,
    publishedAt: source.publishedAt,
    sourcePageUrl: source.sourcePageUrl,
    filenameHint: source.filenameHint,
    formats: source.formats,
    downloadStatus: source.downloadStatus,
    location: source.location,
    index: source.index,
    sidecar: source.sidecar,
    pageType: source.pageType,
    collectionType: source.collectionType,
    collectionTitle: source.collectionTitle,
    downloadable: source.downloadStatus
      ? source.downloadStatus === 'available'
      : true,
  };
}

function toHistoryEntry(job: InternalJob): HistoryEntry {
  return {
    id: job.id,
    item: sourceToMediaItem(job.source),
    filename: job.filename,
    status: historyStatusFromState(job.state),
    downloadId: job.downloadId,
    bytesReceived: job.bytesReceived,
    totalBytes: job.totalBytes,
    paused: job.paused,
    error: job.error,
    output: job.output,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function toRecord(job: InternalJob): DownloadRecord {
  return {
    id: job.id,
    source: job.source,
    state: job.state,
    filename: job.filename,
    downloadId: job.downloadId,
    bytesReceived: job.bytesReceived,
    totalBytes: job.totalBytes,
    progress: job.progress,
    paused: job.paused,
    error: job.error,
    output: job.output,
    attempts: job.attempts,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function recordFromHistory(entry: HistoryEntry): DownloadRecord {
  const state = stateFromHistoryStatus(entry.status);
  const totalBytes = entry.totalBytes && entry.totalBytes > 0 ? entry.totalBytes : undefined;
  const progress =
    state === 'completed'
      ? 100
      : state === 'pending'
        ? 0
        : state === 'downloading' && totalBytes && entry.bytesReceived !== undefined
          ? Math.min(99, Math.round((entry.bytesReceived / totalBytes) * 100))
          : undefined;

  return {
    id: entry.id,
    source: downloadSourceFromMediaItem(entry.item),
    state,
    filename: entry.filename,
    downloadId: entry.downloadId,
    bytesReceived: entry.bytesReceived,
    totalBytes,
    progress,
    paused: entry.paused,
    error: entry.error,
    output: entry.output,
    attempts: entry.downloadId !== undefined ? 1 : 0,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

function sourceIsDownloadable(source: DownloadSource): boolean {
  if (!source.url) {
    return false;
  }

  const supportedUrl = source.sidecar
    ? source.url.startsWith('data:') || isHttpUrl(source.url)
    : isHttpUrl(source.url);

  if (!supportedUrl) {
    return false;
  }

  return !source.downloadStatus || source.downloadStatus === 'available';
}

/**
 * Core download engine. Platform-agnostic: callers provide a DownloadSource with
 * a permitted direct URL. Completion is emitted only after Chrome reports
 * state === "complete". Progress is derived exclusively from Chrome's
 * bytesReceived/totalBytes.
 */
export class DownloadService {
  private pending: InternalJob[] = [];
  private jobs = new Map<string, InternalJob>();
  private downloadIdToJob = new Map<number, string>();
  private cancelRequested = new Set<string>();
  private waiters = new Map<string, () => void>();
  private activeCount = 0;
  private concurrency = DEFAULT_DOWNLOAD_CONCURRENCY;
  private listenerAttached = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private polling = false;
  private initPromise: Promise<void> | null = null;

  async enqueue(
    source: DownloadSource,
    options: {
      autoStart?: boolean;
      filename?: string;
      output?: DownloadOutputInfo;
    } = {},
  ): Promise<DownloadRecord> {
    if (!sourceIsDownloadable(source)) {
      throw new AppError(
        source.url && isHttpUrl(source.url)
          ? 'DOWNLOAD_FAILED'
          : 'INVALID_INPUT',
        'This media has no direct, permitted download URL.',
      );
    }

    this.ensureListener();

    const settings = await getSettings();
    this.setConcurrency(settings.downloadConcurrency);

    if (settings.skipDownloaded) {
      const alreadyDownloaded = await hasCompletedMedia(source.id, source.url);
      if (alreadyDownloaded) {
        throw new AppError(
          'ALREADY_DOWNLOADED',
          'This media is already in your download history.',
        );
      }
    }

    const prepared = await prepareDownloadOutput(
      source,
      settings,
      options.output,
    );
    const output = options.output ?? prepared.output;
    const filename = options.filename
      ? sanitizeDownloadPath(options.filename)
      : buildDownloadPath(
          { ...source, outputExtension: prepared.extension },
          settings,
        );
    const now = Date.now();
    const job: InternalJob = {
      id: createId('dl'),
      source,
      state: 'pending',
      filename,
      output,
      downloadUrl: prepared.url,
      attempts: 0,
      createdAt: now,
      updatedAt: now,
      persist: settings.historyEnabled,
      persisted: false,
      lastPersistedAt: 0,
    };

    this.jobs.set(job.id, job);
    this.pending.push(job);

    if (job.persist) {
      try {
        await addHistoryEntry(toHistoryEntry(job));
        job.persisted = true;
      } catch (error) {
        job.persist = false;
        logger.warn('Could not write download history.', getErrorMessage(error));
      }
    }

    this.broadcast(job);

    if (options.autoStart) {
      this.start(job.id);
    }

    return toRecord(job);
  }

  /**
   * Start a specific pending job, or drain pending jobs up to the concurrency limit.
   */
  start(id?: string): void {
    this.ensureListener();

    if (id) {
      const index = this.pending.findIndex((job) => job.id === id);
      if (index >= 0) {
        const [job] = this.pending.splice(index, 1);
        if (job) {
          this.begin(job);
          return;
        }
      }
    }

    this.pump();
  }

  setConcurrency(value: number): void {
    const next = Number.isFinite(value) ? Math.round(value) : DEFAULT_DOWNLOAD_CONCURRENCY;
    this.concurrency = Math.min(
      MAX_DOWNLOAD_CONCURRENCY,
      Math.max(MIN_DOWNLOAD_CONCURRENCY, next),
    );
    this.pump();
  }

  getConcurrency(): number {
    return this.concurrency;
  }

  async pause(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (
      !job ||
      job.state !== 'downloading' ||
      job.downloadId === undefined ||
      job.paused
    ) {
      return false;
    }

    if (!(await pauseDownload(job.downloadId))) {
      return false;
    }

    job.paused = true;
    job.updatedAt = Date.now();
    await this.persist(job, true);
    this.broadcast(job);
    return true;
  }

  async resume(id: string): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || job.state !== 'downloading' || job.downloadId === undefined || !job.paused) {
      return false;
    }

    if (!(await resumeDownload(job.downloadId))) {
      return false;
    }

    job.paused = false;
    job.updatedAt = Date.now();
    await this.persist(job, true);
    this.broadcast(job);
    return true;
  }

  async cancel(id: string): Promise<boolean> {
    this.ensureListener();
    const job = this.jobs.get(id);

    if (job) {
      if (isTerminal(job.state)) {
        return false;
      }

      if (job.state === 'pending') {
        this.removePending(id);
        await this.finish(job, 'cancelled');
        return true;
      }

      this.cancelRequested.add(id);

      if (job.downloadId === undefined) {
        // Chrome has not returned an id yet. runJob will cancel as soon as it does.
        await this.finish(job, 'cancelled');
        return true;
      }

      const downloadId = job.downloadId;
      await cancelDownload(downloadId);
      const download = await getDownload(downloadId);

      if (download?.state === 'complete') {
        await this.finish(job, 'completed', download);
        return false;
      }

      if (download?.state === 'interrupted') {
        await this.finish(job, 'cancelled', download);
        return true;
      }

      return true;
    }

    const entry = await getHistoryEntry(id);
    if (!entry) {
      return false;
    }

    if (
      entry.status === 'completed' ||
      entry.status === 'failed' ||
      entry.status === 'cancelled'
    ) {
      return false;
    }

    if (entry.downloadId !== undefined) {
      await cancelDownload(entry.downloadId);
      const download = await getDownload(entry.downloadId);

      if (download?.state === 'complete') {
        const updated = await updateHistoryEntry(entry.id, {
          status: 'completed',
          paused: false,
          bytesReceived: download.bytesReceived,
          totalBytes: download.totalBytes > 0 ? download.totalBytes : undefined,
          updatedAt: Date.now(),
        });
        if (updated) {
          this.broadcastEntry(updated);
        }
        return false;
      }
    }

    const updated = await updateHistoryEntry(entry.id, {
      status: 'cancelled',
      paused: false,
      updatedAt: Date.now(),
    });

    if (updated) {
      this.broadcastEntry(updated);
    }

    return true;
  }

  async retry(id: string): Promise<boolean> {
    let job = this.jobs.get(id);

    if (!job) {
      const entry = await getHistoryEntry(id);
      if (!entry) {
        return false;
      }

      const record = recordFromHistory(entry);
      job = {
        ...record,
        persist: true,
        persisted: true,
        lastPersistedAt: 0,
      };
      this.jobs.set(job.id, job);
    }

    if (job.state !== 'failed' && job.state !== 'cancelled') {
      return false;
    }

    if (job.downloadId !== undefined) {
      this.downloadIdToJob.delete(job.downloadId);
    }

    const settings = await getSettings();
    job.state = 'pending';
    job.error = undefined;
    job.downloadId = undefined;
    job.bytesReceived = undefined;
    job.totalBytes = undefined;
    job.progress = undefined;
    job.paused = false;
    job.attempts += 1;
    const prepared = await prepareDownloadOutput(
      job.source,
      settings,
      job.source.sidecar ? job.output : undefined,
    );
    job.output = job.source.sidecar ? job.output : prepared.output;
    job.downloadUrl = prepared.url;
    job.filename = job.source.sidecar
      ? job.filename
      : buildDownloadPath(
          { ...job.source, outputExtension: prepared.extension },
          settings,
        );
    job.updatedAt = Date.now();

    if (job.persisted) {
      await updateHistoryEntry(job.id, {
        filename: job.filename,
        output: job.output,
        updatedAt: job.updatedAt,
      });
    }

    if (!this.pending.some((candidate) => candidate.id === job?.id)) {
      this.pending.push(job);
    }

    await this.persist(job, true);
    this.broadcast(job);
    this.start(job.id);
    return true;
  }

  async getStatus(id: string): Promise<DownloadRecord | null> {
    const job = this.jobs.get(id);
    if (job) {
      return toRecord(job);
    }

    try {
      const entry = await getHistoryEntry(id);
      return entry ? recordFromHistory(entry) : null;
    } catch {
      return null;
    }
  }

  async getHistory(limit = 100): Promise<DownloadRecord[]> {
    const records = new Map<string, DownloadRecord>();

    for (const job of this.jobs.values()) {
      records.set(job.id, toRecord(job));
    }

    try {
      const page = await queryHistory({ limit });
      for (const entry of page.entries) {
        if (!records.has(entry.id)) {
          records.set(entry.id, recordFromHistory(entry));
        }
      }
    } catch (error) {
      logger.warn('Could not read persisted download history.', getErrorMessage(error));
    }

    return [...records.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  async init(): Promise<void> {
    this.ensureListener();

    this.initPromise ??= this.reconcileActiveDownloads().catch((error: unknown) => {
      logger.warn('Failed to reconcile downloads.', getErrorMessage(error));
    });

    return this.initPromise;
  }

  resetForTests(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.pending.length = 0;
    this.jobs.clear();
    this.downloadIdToJob.clear();
    this.cancelRequested.clear();
    this.waiters.clear();
    this.activeCount = 0;
    this.concurrency = DEFAULT_DOWNLOAD_CONCURRENCY;
    this.listenerAttached = false;
    this.polling = false;
    this.initPromise = null;
  }

  private begin(job: InternalJob): void {
    this.activeCount += 1;
    void this.runJob(job).finally(() => {
      this.activeCount -= 1;
      this.pump();
    });
  }

  private pump(): void {
    while (this.activeCount < this.concurrency) {
      const job = this.pending.shift();
      if (!job) {
        return;
      }
      this.begin(job);
    }
  }

  private async runJob(job: InternalJob): Promise<void> {
    job.state = 'downloading';
    job.error = undefined;
    job.paused = false;
    job.updatedAt = Date.now();

    await this.persist(job, true);
    this.broadcast(job);
    this.ensurePollTimer();

    try {
      const settings = await getSettings();
      const downloadId = await startDownload({
        url: job.downloadUrl ?? job.source.url,
        filename: job.filename,
        conflictAction: 'uniquify',
        saveAs: settings.askWhereToSave,
      });

      job.downloadId = downloadId;
      this.downloadIdToJob.set(downloadId, job.id);
      await this.persist(job, true);
      this.broadcast(job);

      if (this.cancelRequested.has(job.id)) {
        await cancelDownload(downloadId);
        return;
      }

      const current = await getDownload(downloadId);

      if (current?.state === 'complete') {
        await this.finish(job, 'completed', current);
        return;
      }

      if (current?.state === 'interrupted') {
        await this.finish(
          job,
          this.cancelRequested.has(job.id) || current.error === 'USER_CANCELED'
            ? 'cancelled'
            : 'failed',
          current,
          current.error ?? undefined,
        );
        return;
      }

      if (!isTerminal(job.state)) {
        await this.waitForJob(job.id);
      }
    } catch (error) {
      if (this.cancelRequested.has(job.id) || /cancel/i.test(getErrorMessage(error))) {
        await this.finish(job, 'cancelled');
      } else {
        job.state = 'failed';
        job.error = isAppError(error)
          ? error.message
          : getErrorMessage(error) || 'Chrome could not start this download.';
        job.updatedAt = Date.now();
        await this.persist(job, true);
        this.broadcast(job);
        this.resolveWaiter(job.id);
      }
    } finally {
      if (job.downloadId !== undefined) {
        this.downloadIdToJob.delete(job.downloadId);
      }
      this.cancelRequested.delete(job.id);
      this.waiters.delete(job.id);
      this.stopPollIfIdle();
      await this.pruneIfNeeded();
    }
  }

  private async finish(
    job: InternalJob,
    state: Extract<DownloadState, 'completed' | 'failed' | 'cancelled'>,
    download?: chrome.downloads.DownloadItem,
    errorCode?: string,
  ): Promise<void> {
    if (isTerminal(job.state)) {
      return;
    }

    job.state = state;
    job.updatedAt = Date.now();
    job.paused = false;

    if (download) {
      job.bytesReceived = Math.max(0, download.bytesReceived);
      job.totalBytes =
        download.totalBytes > 0 ? download.totalBytes : undefined;
      job.progress =
        state === 'completed'
          ? 100
          : job.totalBytes
            ? Math.min(
                99,
                Math.round((job.bytesReceived / job.totalBytes) * 100),
              )
            : undefined;
    } else if (state === 'completed') {
      job.progress = 100;
    }

    if (state === 'failed') {
      job.error = describeDownloadError(errorCode ?? download?.error ?? undefined);
    } else if (state === 'cancelled') {
      job.error = undefined;
    } else {
      job.error = undefined;
    }

    await this.persist(job, true);
    this.broadcast(job);
    this.resolveWaiter(job.id);
    this.stopPollIfIdle();
    this.trimSessionHistory();
  }

  private async handleDelta(delta: chrome.downloads.DownloadDelta): Promise<void> {
    const jobId = this.downloadIdToJob.get(delta.id);
    const job = jobId ? this.jobs.get(jobId) : undefined;

    if (job) {
      if (delta.paused?.current !== undefined && !isTerminal(job.state)) {
        job.paused = delta.paused.current;
        job.updatedAt = Date.now();
        await this.persist(job);
        this.broadcast(job);
      }

      if (delta.state?.current === 'complete') {
        const download = await getDownload(delta.id);
        await this.finish(job, 'completed', download);
        return;
      }

      if (delta.state?.current === 'interrupted') {
        const download = await getDownload(delta.id);
        const cancelled =
          this.cancelRequested.has(job.id) || delta.error?.current === 'USER_CANCELED';
        await this.finish(
          job,
          cancelled ? 'cancelled' : 'failed',
          download,
          delta.error?.current,
        );
        return;
      }

      return;
    }

    if (delta.state?.current !== 'complete' && delta.state?.current !== 'interrupted') {
      return;
    }

    const entry = await findHistoryByDownloadId(delta.id);
    if (!entry || entry.status === 'completed' || entry.status === 'failed') {
      return;
    }

    const download = await getDownload(delta.id);
    const cancelled =
      delta.error?.current === 'USER_CANCELED' || entry.status === 'cancelled';

    const updated = await updateHistoryEntry(entry.id, {
      status:
        delta.state.current === 'complete'
          ? 'completed'
          : cancelled
            ? 'cancelled'
            : 'failed',
      bytesReceived: download?.bytesReceived,
      totalBytes:
        download && download.totalBytes > 0 ? download.totalBytes : undefined,
      paused: false,
      error:
        delta.state.current === 'interrupted' && !cancelled
          ? describeDownloadError(delta.error?.current)
          : undefined,
      updatedAt: Date.now(),
    });

    if (updated) {
      this.broadcastEntry(updated);
    }
  }

  private ensureListener(): void {
    if (this.listenerAttached) {
      return;
    }

    this.listenerAttached = true;
    onDownloadChanged((delta) => {
      void this.handleDelta(delta);
    });
  }

  private ensurePollTimer(): void {
    if (this.pollTimer !== null) {
      return;
    }

    this.pollTimer = setInterval(() => {
      void this.pollProgress();
    }, PROGRESS_POLL_MS);
  }

  private stopPollIfIdle(): void {
    const active = [...this.jobs.values()].some(
      (job) => job.state === 'downloading' && job.downloadId !== undefined,
    );

    if (!active && this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async pollProgress(): Promise<void> {
    if (this.polling) {
      return;
    }

    this.polling = true;

    try {
      const activeJobs = [...this.jobs.values()].filter(
        (job) => job.state === 'downloading' && job.downloadId !== undefined,
      );

      if (activeJobs.length === 0) {
        this.stopPollIfIdle();
        return;
      }

      for (const job of activeJobs) {
        if (job.downloadId === undefined) {
          continue;
        }

        const download = await getDownload(job.downloadId);
        if (!download) {
          continue;
        }

        if (download.state === 'complete') {
          await this.finish(job, 'completed', download);
          continue;
        }

        if (download.state === 'interrupted') {
          await this.finish(
            job,
            this.cancelRequested.has(job.id) || download.error === 'USER_CANCELED'
              ? 'cancelled'
              : 'failed',
            download,
            download.error ?? undefined,
          );
          continue;
        }

        const totalBytes =
          download.totalBytes > 0 ? download.totalBytes : undefined;
        const progress = progressFromDownload(download);

        if (
          job.bytesReceived !== download.bytesReceived ||
          job.totalBytes !== totalBytes ||
          job.progress !== progress ||
          job.paused !== download.paused
        ) {
          job.bytesReceived = download.bytesReceived;
          job.totalBytes = totalBytes;
          job.progress = progress;
          job.paused = download.paused;
          job.updatedAt = Date.now();
          await this.persist(job);
          this.broadcast(job);
        }
      }
    } finally {
      this.polling = false;
      this.stopPollIfIdle();
    }
  }

  private async reconcileActiveDownloads(): Promise<void> {
    const activeEntries = await getActiveHistoryEntries();

    for (const entry of activeEntries) {
      if (entry.downloadId === undefined) {
        await updateHistoryEntry(entry.id, {
          status: 'failed',
          error: 'The download was interrupted when MediaVault restarted.',
          updatedAt: Date.now(),
        });
        continue;
      }

      const download = await getDownload(entry.downloadId);

      if (!download) {
        await updateHistoryEntry(entry.id, {
          status: 'failed',
          error: 'The download could not be found after MediaVault restarted.',
          updatedAt: Date.now(),
        });
        continue;
      }

      if (download.state === 'complete') {
        await updateHistoryEntry(entry.id, {
          status: 'completed',
          bytesReceived: download.bytesReceived,
          totalBytes: download.totalBytes > 0 ? download.totalBytes : undefined,
          paused: false,
          updatedAt: Date.now(),
        });
        continue;
      }

      if (download.state === 'interrupted') {
        await updateHistoryEntry(entry.id, {
          status: 'failed',
          error: describeDownloadError(download.error ?? undefined),
          paused: false,
          updatedAt: Date.now(),
        });
        continue;
      }

      const record = recordFromHistory(entry);
      const job: InternalJob = {
        ...record,
        state: 'downloading',
        downloadId: entry.downloadId,
        bytesReceived: download.bytesReceived,
        totalBytes: download.totalBytes > 0 ? download.totalBytes : undefined,
        progress: progressFromDownload(download),
        paused: download.paused,
        persist: true,
        persisted: true,
        lastPersistedAt: 0,
      };

      this.jobs.set(job.id, job);
      this.downloadIdToJob.set(entry.downloadId, job.id);
      this.ensurePollTimer();
    }
  }

  private async persist(job: InternalJob, force = false): Promise<void> {
    if (!job.persist) {
      return;
    }

    const now = Date.now();
    if (!force && job.state === 'downloading' && now - job.lastPersistedAt < 1_500) {
      return;
    }

    job.lastPersistedAt = now;

    try {
      if (!job.persisted) {
        await addHistoryEntry(toHistoryEntry(job));
        job.persisted = true;
        return;
      }

      await updateHistoryEntry(job.id, {
        status: historyStatusFromState(job.state),
        downloadId: job.downloadId,
        bytesReceived: job.bytesReceived,
        totalBytes: job.totalBytes,
        paused: job.paused,
        error: job.error,
        updatedAt: job.updatedAt,
      });
    } catch (error) {
      logger.warn('Could not persist download state.', getErrorMessage(error));
      job.persist = false;
    }
  }

  private broadcast(job: InternalJob): void {
    this.broadcastEntry(toHistoryEntry(job));
  }

  private broadcastEntry(entry: HistoryEntry): void {
    broadcastEvent({ type: 'DOWNLOADS_UPDATED', entries: [entry] });
  }

  private resolveWaiter(id: string): void {
    const resolve = this.waiters.get(id);
    if (!resolve) {
      return;
    }

    this.waiters.delete(id);
    resolve();
  }

  private waitForJob(id: string): Promise<void> {
    return new Promise<void>((resolve) => {
      this.waiters.set(id, resolve);
    });
  }

  private removePending(id: string): void {
    const index = this.pending.findIndex((job) => job.id === id);
    if (index >= 0) {
      this.pending.splice(index, 1);
    }
  }

  private trimSessionHistory(): void {
    const terminal = [...this.jobs.values()]
      .filter((job) => isTerminal(job.state))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    for (const job of terminal.slice(SESSION_HISTORY_LIMIT)) {
      this.jobs.delete(job.id);
    }
  }

  private async pruneIfNeeded(): Promise<void> {
    try {
      const settings = await getSettings();
      if (settings.historyEnabled) {
        await pruneHistory(settings.maxHistoryEntries);
      }
    } catch (error) {
      logger.warn('Failed to prune download history.', getErrorMessage(error));
    }
  }
}

export const downloadService = new DownloadService();
