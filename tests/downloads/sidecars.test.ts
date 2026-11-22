import { describe, expect, it } from 'vitest';
import { enqueueDownloads } from '@/downloads/queue';
import { saveSettings } from '@/storage/settings';
import type { MediaItem } from '@/types/media';
import {
  chromeMock,
  completeDownload,
  getDownloadIds,
} from '../mocks/chrome';

const ITEM: MediaItem = {
  id: 'instagram_sidecar1234',
  platform: 'instagram',
  kind: 'video',
  url: 'https://scontent.cdninstagram.com/v/clip.mp4',
  thumbnailUrl: 'https://scontent.cdninstagram.com/v/poster.jpg',
  author: 'studio',
  caption: 'A caption for the clip',
  postUrl: 'https://www.instagram.com/p/ABC123/',
  sourcePageUrl: 'https://www.instagram.com/p/ABC123/',
  publishedAt: Date.UTC(2026, 10, 22, 10, 30),
  location: 'Lisbon',
  postId: 'ABC123',
  pageType: 'post',
  downloadable: true,
};

async function waitFor<T>(
  read: () => Promise<T> | T,
  timeoutMs = 4_000,
): Promise<T> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const value = await read();
    if (value) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error('Timed out waiting for a condition.');
}

function decodeDataUrl(url: string | undefined): string {
  if (!url?.startsWith('data:')) {
    return '';
  }

  const base64 = url.split(',')[1] ?? '';
  return Buffer.from(base64, 'base64').toString('utf8');
}

describe('download sidecars', () => {
  it('queues thumbnail, caption, and metadata files when enabled', async () => {
    await saveSettings({
      downloadThumbnails: true,
      saveCaption: true,
      saveMetadata: true,
    });

    const result = await enqueueDownloads([ITEM]);
    expect(result.accepted).toHaveLength(1);

    const finished = new Set<number>();
    await waitFor(() => {
      for (const id of getDownloadIds()) {
        if (!finished.has(id)) {
          finished.add(id);
          completeDownload(id);
        }
      }
      return chromeMockOptions().length >= 4;
    });

    const options = chromeMockOptions();
    const filenames = options
      .map((option) => option.filename ?? '')
      .filter(Boolean);

    expect(filenames.some((name) => name.endsWith('.thumbnail.jpg'))).toBe(true);
    expect(filenames.some((name) => name.endsWith('.caption.txt'))).toBe(true);
    expect(filenames.some((name) => name.endsWith('.metadata.json'))).toBe(true);
    expect(filenames.some((name) => name.includes('/videos/'))).toBe(true);

    const caption = options.find((option) =>
      option.filename?.endsWith('.caption.txt'),
    );
    expect(caption?.url.startsWith('data:text/plain')).toBe(true);
    expect(decodeDataUrl(caption?.url)).toContain('A caption for the clip');
    expect(decodeDataUrl(caption?.url)).toContain(
      'https://www.instagram.com/p/ABC123/',
    );

    const metadata = options.find((option) =>
      option.filename?.endsWith('.metadata.json'),
    );
    const parsed = JSON.parse(decodeDataUrl(metadata?.url)) as {
      publicationDate?: string;
      publishedAt?: string;
      sourceUrl?: string;
      location?: string;
      actualOutput?: { label?: string };
    };

    expect(parsed.sourceUrl).toBe(ITEM.url);
    expect(parsed.location).toBe('Lisbon');
    expect(parsed.publishedAt).toBe('2026-11-22T10:30:00.000Z');
    expect(parsed.actualOutput?.label).toBe('MP4 · Source');
  });

  it('does not queue sidecars when their settings are off', async () => {
    await enqueueDownloads([ITEM]);
    await waitFor(() => getDownloadIds().length >= 1);

    expect(chromeMockOptions()).toHaveLength(1);
  });
});

function chromeMockOptions(): chrome.downloads.DownloadOptions[] {
  return chromeMock.downloads.download.mock.calls.map(
    ([options]) => options as chrome.downloads.DownloadOptions,
  );
}
