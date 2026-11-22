import { describe, expect, it } from 'vitest';
import { cancelQueuedDownload, enqueueDownloads } from '@/downloads/queue';
import { getHistoryEntry, queryHistory } from '@/storage/history';
import { saveSettings } from '@/storage/settings';
import type { HistoryEntry } from '@/types/history';
import type { MediaItem } from '@/types/media';
import {
  chromeMock,
  completeDownload,
  failDownload,
  getLastDownloadId,
  getLastDownloadOptions,
} from '../mocks/chrome';

const ITEM: MediaItem = {
  id: 'instagram_abc12345',
  platform: 'instagram',
  kind: 'video',
  url: 'https://scontent.cdninstagram.com/v/clip.mp4',
  author: 'studio',
  downloadable: true,
};

async function waitFor<T>(
  read: () => Promise<T | undefined> | T | undefined,
  timeoutMs = 3_000,
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = await read();
    if (value !== undefined) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error('Timed out waiting for a condition.');
}

async function waitForStatus(
  historyId: string,
  status: HistoryEntry['status'],
): Promise<HistoryEntry> {
  return waitFor(async () => {
    const entry = await getHistoryEntry(historyId);
    return entry?.status === status ? entry : undefined;
  });
}

describe('download queue', () => {
  it('starts downloads with a safe path and records progress', async () => {
    const result = await enqueueDownloads([ITEM]);

    expect(result.accepted).toHaveLength(1);
    expect(result.skipped).toBe(0);

    const downloadId = await waitFor(() => getLastDownloadId());
    const options = getLastDownloadOptions();

    expect(options?.url).toBe(ITEM.url);
    expect(options?.filename).toMatch(
      /^MediaVault\/instagram\/videos\/instagram-studio-[0-9a-f]{8}\.mp4$/,
    );
    expect(options?.conflictAction).toBe('uniquify');
    expect(options?.saveAs).toBe(false);

    const historyId = result.accepted[0]!.id;
    await waitForStatus(historyId, 'downloading');

    completeDownload(downloadId);

    const completed = await waitForStatus(historyId, 'completed');
    expect(completed.downloadId).toBe(downloadId);
    expect(completed.filename).toContain('MediaVault/instagram/');
  });

  it('skips items without a direct download link', async () => {
    const result = await enqueueDownloads([
      { ...ITEM, downloadable: false, unsupportedReason: 'Blob stream' },
    ]);

    expect(result.accepted).toHaveLength(0);
    expect(result.skipped).toBe(1);
    expect(chromeMock.downloads.download).not.toHaveBeenCalled();
  });

  it('maps an interrupted download to a clear failure message', async () => {
    const result = await enqueueDownloads([ITEM]);
    const downloadId = await waitFor(() => getLastDownloadId());

    failDownload(downloadId, 'NETWORK_FAILED');

    const failed = await waitForStatus(result.accepted[0]!.id, 'failed');
    expect(failed.error).toMatch(/expired/i);
  });

  it('cancels an in-flight download', async () => {
    const result = await enqueueDownloads([ITEM]);
    const downloadId = await waitFor(() => getLastDownloadId());
    const historyId = result.accepted[0]!.id;

    await expect(cancelQueuedDownload(historyId)).resolves.toBe(true);
    const cancelled = await waitForStatus(historyId, 'cancelled');
    expect(cancelled.id).toBe(historyId);

    await waitFor(() =>
      chromeMock.downloads.cancel.mock.calls.some(([id]) => id === downloadId)
        ? true
        : undefined,
    );
    expect(chromeMock.downloads.cancel).toHaveBeenCalledWith(downloadId);
  });

  it('reports already-downloaded items when Skip Downloaded is enabled', async () => {
    await saveSettings({ skipDownloaded: true });

    const first = await enqueueDownloads([ITEM]);
    const downloadId = await waitFor(() => getLastDownloadId());
    completeDownload(downloadId);
    await waitForStatus(first.accepted[0]!.id, 'completed');

    const second = await enqueueDownloads([ITEM]);

    expect(second.accepted).toHaveLength(0);
    expect(second.skipped).toBe(0);
    expect(second.alreadyDownloaded).toBe(1);
    expect(chromeMock.downloads.download).toHaveBeenCalledTimes(1);
  });

  it('does not write history when history is disabled', async () => {
    await saveSettings({ historyEnabled: false });

    const result = await enqueueDownloads([ITEM]);
    expect(result.accepted).toHaveLength(1);

    const downloadId = await waitFor(() => getLastDownloadId());
    completeDownload(downloadId);

    await new Promise((resolve) => setTimeout(resolve, 150));

    const page = await queryHistory();
    expect(page.total).toBe(0);
  });
});
