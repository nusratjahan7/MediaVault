import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DownloadService } from '@/downloads/service';
import { saveSettings } from '@/storage/settings';
import type { DownloadRecord, DownloadSource } from '@/types/download';
import {
  chromeMock,
  completeDownload,
  failDownload,
  getDownloadIds,
  getLastDownloadId,
  getLastDownloadOptions,
  setDownloadProgress,
} from '../mocks/chrome';

async function sendHistoryClear(): Promise<void> {
  const { clearHistory } = await import('@/storage/history');
  await clearHistory();
}

const SOURCE: DownloadSource = {
  id: 'instagram_abc12345',
  platform: 'instagram',
  kind: 'video',
  url: 'https://scontent.cdninstagram.com/v/clip.mp4',
  thumbnailUrl: 'https://scontent.cdninstagram.com/v/poster.jpg',
  author: 'studio',
  caption: 'A source clip',
  postId: 'ABC123',
  sourcePageUrl: 'https://www.instagram.com/p/ABC123/',
  downloadStatus: 'available',
};

let service: DownloadService;

async function waitFor<T>(
  read: () => Promise<T | undefined> | T | undefined,
  timeoutMs = 4_000,
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = await read();
    if (value !== undefined) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error('Timed out waiting for a condition.');
}

async function waitForState(
  id: string,
  state: DownloadRecord['state'],
): Promise<DownloadRecord> {
  return waitFor(async () => {
    const record = await service.getStatus(id);
    return record?.state === state ? record : undefined;
  });
}

async function waitForAttachedDownload(
  id: string,
  downloadId: number,
): Promise<DownloadRecord> {
  return waitFor(async () => {
    const record = await service.getStatus(id);
    return record?.downloadId === downloadId ? record : undefined;
  });
}

beforeEach(() => {
  service = new DownloadService();
});

afterEach(() => {
  service.resetForTests();
});

describe('DownloadService', () => {
  it('enqueues a single source as pending without starting or completing it', async () => {
    const record = await service.enqueue(SOURCE);

    expect(record.state).toBe('pending');
    expect(record.source.url).toBe(SOURCE.url);
    expect(record.filename).toMatch(
      /^MediaVault\/instagram\/videos\/instagram-studio-[0-9a-f]{8}\.mp4$/,
    );
    expect(chromeMock.downloads.download).not.toHaveBeenCalled();
    expect((await service.getStatus(record.id))?.state).toBe('pending');
  });

  it('downloads the highest exposed video source and records actual quality', async () => {
    await saveSettings({ videoQuality: 'highest' });
    const hdUrl = 'https://scontent.cdninstagram.com/v/hd.mp4';
    const record = await service.enqueue({
      ...SOURCE,
      formats: [
        {
          id: 'sd',
          label: 'SD',
          extension: 'mp4',
          mimeType: 'video/mp4',
          kind: 'video',
          quality: 'sd',
          url: SOURCE.url,
        },
        {
          id: 'hd',
          label: 'HD 1080p',
          extension: 'mp4',
          mimeType: 'video/mp4',
          kind: 'video',
          quality: 'hd',
          url: hdUrl,
        },
      ],
    });

    expect(record.output?.quality).toBe('hd');
    expect(record.output?.label).toBe('MP4 · HD');

    service.start(record.id);
    await waitFor(() => getLastDownloadId());
    expect(getLastDownloadOptions()?.url).toBe(hdUrl);
  });

  it('clearly falls back to the original image when conversion is unavailable', async () => {
    await saveSettings({ imageFormat: 'webp' });
    const source: DownloadSource = {
      ...SOURCE,
      id: 'instagram_photo123',
      kind: 'image',
      url: 'https://scontent.cdninstagram.com/v/photo.jpg',
      formats: undefined,
    };
    const record = await service.enqueue(source);

    expect(record.filename.endsWith('.jpg')).toBe(true);
    expect(record.output?.converted).toBe(false);
    expect(record.output?.note).toMatch(/media processing access/i);
  });

  it('automatically retries failed downloads up to the configured count', async () => {
    await saveSettings({ retryCount: 1 });
    const record = await service.enqueue(SOURCE);
    service.start(record.id);

    const firstId = await waitFor(() => getLastDownloadId());
    failDownload(firstId, 'NETWORK_FAILED');

    const secondId = await waitFor(() => {
      const ids = getDownloadIds();
      return ids.length > 1 ? ids.at(-1) : undefined;
    });

    failDownload(secondId!, 'NETWORK_FAILED');
    const failed = await waitForState(record.id, 'failed');

    expect(failed.attempts).toBe(1);
    expect(failed.error).toBeDefined();
    expect(getDownloadIds()).toHaveLength(2);
  });

  it('shows a Chrome notification for terminal downloads when enabled', async () => {
    await saveSettings({ showDownloadNotifications: true });
    const record = await service.enqueue(SOURCE);
    service.start(record.id);
    const downloadId = await waitFor(() => getLastDownloadId());
    completeDownload(downloadId);
    await waitForState(record.id, 'completed');

    expect(chromeMock.notifications.create).toHaveBeenCalledWith(
      expect.stringContaining(record.id),
      expect.objectContaining({
        type: 'basic',
        title: expect.stringContaining('saved'),
      }),
    );
  });

  it('skips media remembered by Download new media only even after history clears', async () => {
    const first = await service.enqueue(SOURCE);
    service.start(first.id);
    const downloadId = await waitFor(() => getLastDownloadId());
    completeDownload(downloadId);
    await waitForState(first.id, 'completed');

    await saveSettings({ downloadNewMediaOnly: true });
    await sendHistoryClear();

    await expect(service.enqueue(SOURCE)).rejects.toMatchObject({
      code: 'ALREADY_DOWNLOADED',
    });
  });

  it('completes only after Chrome confirms the download', async () => {
    const record = await service.enqueue(SOURCE);
    service.start(record.id);

    const downloadId = await waitFor(() => getLastDownloadId());
    const downloading = await waitForAttachedDownload(record.id, downloadId);

    expect(downloading.state).toBe('downloading');
    expect(downloading.progress).toBeUndefined();
    expect(downloading.downloadId).toBe(downloadId);

    const options = getLastDownloadOptions();
    expect(options).toMatchObject({
      url: SOURCE.url,
      conflictAction: 'uniquify',
      saveAs: false,
    });

    // No browser completion yet.
    expect((await service.getStatus(record.id))?.state).toBe('downloading');

    completeDownload(downloadId);
    const completed = await waitForState(record.id, 'completed');

    expect(completed.progress).toBe(100);
    expect(completed.downloadId).toBe(downloadId);
    expect(completed.error).toBeUndefined();
  });

  it('derives progress only from Chrome bytes', async () => {
    const record = await service.enqueue(SOURCE);
    service.start(record.id);
    const downloadId = await waitFor(() => getLastDownloadId());
    await waitForAttachedDownload(record.id, downloadId);

    setDownloadProgress(downloadId, 500, 1_000);

    const progressed = await waitFor(async () => {
      const status = await service.getStatus(record.id);
      return status?.progress === 50 ? status : undefined;
    });

    expect(progressed.bytesReceived).toBe(500);
    expect(progressed.totalBytes).toBe(1_000);
    expect(progressed.state).toBe('downloading');

    completeDownload(downloadId);
    const completed = await waitForState(record.id, 'completed');
    expect(completed.progress).toBe(100);
    expect(completed.bytesReceived).toBe(1_000);
  });

  it('pauses and resumes through the Chrome Downloads API when available', async () => {
    const record = await service.enqueue(SOURCE);
    service.start(record.id);
    const downloadId = await waitFor(() => getLastDownloadId());
    await waitForAttachedDownload(record.id, downloadId);

    await expect(service.pause(record.id)).resolves.toBe(true);
    expect(chromeMock.downloads.pause).toHaveBeenCalledWith(downloadId);
    expect((await service.getStatus(record.id))?.paused).toBe(true);

    await expect(service.resume(record.id)).resolves.toBe(true);
    expect(chromeMock.downloads.resume).toHaveBeenCalledWith(downloadId);
    expect((await service.getStatus(record.id))?.paused).toBe(false);

    completeDownload(downloadId);
    await waitForState(record.id, 'completed');
  });

  it('cancels a pending job without contacting Chrome Downloads', async () => {
    const record = await service.enqueue(SOURCE);

    await expect(service.cancel(record.id)).resolves.toBe(true);
    expect((await service.getStatus(record.id))?.state).toBe('cancelled');
    expect(chromeMock.downloads.download).not.toHaveBeenCalled();
  });

  it('cancels an in-flight job and waits for Chrome state', async () => {
    const record = await service.enqueue(SOURCE);
    service.start(record.id);
    const downloadId = await waitFor(() => getLastDownloadId());
    await waitForAttachedDownload(record.id, downloadId);

    await expect(service.cancel(record.id)).resolves.toBe(true);
    expect(chromeMock.downloads.cancel).toHaveBeenCalledWith(downloadId);

    const cancelled = await waitForState(record.id, 'cancelled');
    expect(cancelled.progress).not.toBe(100);
  });

  it('retries a failed job with the same source and a fresh browser download', async () => {
    const record = await service.enqueue(SOURCE);
    service.start(record.id);
    const firstDownloadId = await waitFor(() => getLastDownloadId());
    await waitForAttachedDownload(record.id, firstDownloadId);

    failDownload(firstDownloadId, 'SERVER_FORBIDDEN');
    const failed = await waitForState(record.id, 'failed');
    expect(failed.error).toMatch(/expired/i);

    const callsBefore = chromeMock.downloads.download.mock.calls.length;
    await expect(service.retry(record.id)).resolves.toBe(true);

    const secondDownloadId = await waitFor(() => {
      const id = getLastDownloadId();
      return id !== undefined && id !== firstDownloadId ? id : undefined;
    });
    expect(chromeMock.downloads.download.mock.calls.length).toBe(callsBefore + 1);

    const retried = await waitForAttachedDownload(record.id, secondDownloadId);
    expect(retried.attempts).toBe(1);
    expect(retried.state).toBe('downloading');
    expect(retried.state).not.toBe('completed');

    completeDownload(secondDownloadId);
    await waitForState(record.id, 'completed');
  });

  it('uses Chrome Save As when the user asks for a folder choice', async () => {
    await saveSettings({ askWhereToSave: true });

    const record = await service.enqueue(SOURCE);
    service.start(record.id);
    const downloadId = await waitFor(() => getLastDownloadId());

    expect(getLastDownloadOptions()?.saveAs).toBe(true);

    completeDownload(downloadId);
    await waitForState(record.id, 'completed');
  });

  it('respects the configured concurrency limit', async () => {
    await saveSettings({ downloadConcurrency: 1 });

    const first = await service.enqueue(SOURCE);
    const second = await service.enqueue({
      ...SOURCE,
      id: 'instagram_second',
      url: 'https://scontent.cdninstagram.com/v/second.mp4',
    });

    service.start();

    const firstDownloadId = await waitFor(() => getLastDownloadId());
    await waitForAttachedDownload(first.id, firstDownloadId);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(chromeMock.downloads.download).toHaveBeenCalledTimes(1);

    completeDownload(firstDownloadId);
    await waitForState(first.id, 'completed');

    const secondDownloadId = await waitFor(() => {
      const id = getLastDownloadId();
      return id !== undefined && id !== firstDownloadId ? id : undefined;
    });
    await waitForAttachedDownload(second.id, secondDownloadId);
    completeDownload(secondDownloadId);
    await waitForState(second.id, 'completed');
  });

  it('keeps duplicate filenames safe with Chrome uniquify behavior', async () => {
    await service.enqueue(SOURCE);
    await service.enqueue(SOURCE);
    service.start();

    const firstDownloadId = await waitFor(() => getLastDownloadId());
    completeDownload(firstDownloadId);

    await waitFor(() =>
      chromeMock.downloads.download.mock.calls.length >= 2 ? true : undefined,
    );

    const options = chromeMock.downloads.download.mock.calls.map(([value]) => value);
    const filenames = options
      .map((option) => ('filename' in option ? option.filename : undefined))
      .filter((filename): filename is string => typeof filename === 'string');

    expect(filenames).toHaveLength(2);
    expect(filenames[0]).toBe(filenames[1]);
    expect(options.every((option) => option.conflictAction === 'uniquify')).toBe(true);

    for (const downloadId of getDownloadIds()) {
      completeDownload(downloadId);
    }
  });

  it('returns typed history from the same service', async () => {
    const record = await service.enqueue(SOURCE);
    service.start(record.id);
    const downloadId = await waitFor(() => getLastDownloadId());
    await waitForAttachedDownload(record.id, downloadId);
    completeDownload(downloadId);
    await waitForState(record.id, 'completed');

    const history = await service.getHistory();
    const saved = history.find((entry) => entry.id === record.id);

    expect(saved).toBeDefined();
    expect(saved?.state).toBe('completed');
    expect(saved?.filename).toBe(record.filename);
    expect(saved?.source.url).toBe(SOURCE.url);
  });

  it('skips media that already has a completed download when enabled', async () => {
    const record = await service.enqueue(SOURCE);
    service.start(record.id);
    const downloadId = await waitFor(() => getLastDownloadId());
    await waitForAttachedDownload(record.id, downloadId);
    completeDownload(downloadId);
    await waitForState(record.id, 'completed');

    await saveSettings({ skipDownloaded: true });

    await expect(service.enqueue(SOURCE)).rejects.toMatchObject({
      code: 'ALREADY_DOWNLOADED',
    });
    expect(chromeMock.downloads.download).toHaveBeenCalledTimes(1);
  });

  it('rejects platform page URLs instead of saving HTML as a video', async () => {
    await expect(
      service.enqueue({
        ...SOURCE,
        url: 'https://www.instagram.com/reel/ABC123/',
      }),
    ).rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });

    await expect(
      service.enqueue({
        ...SOURCE,
        url: 'https://www.instagram.com/reel/ABC123/',
        formats: undefined,
      }),
    ).rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
  });

  it('rejects sources without a permitted direct URL', async () => {
    await expect(
      service.enqueue({ ...SOURCE, url: 'blob:https://www.instagram.com/1' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      service.enqueue({ ...SOURCE, downloadStatus: 'restricted' }),
    ).rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
  });
});
