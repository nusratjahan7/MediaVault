import { textDataUrl } from '@/services/image-conversion';
import { getSettings } from '@/storage/settings';
import type {
  DownloadOutputInfo,
  DownloadRecord,
  DownloadSidecar,
  DownloadSource,
  EnqueueResult,
} from '@/types/download';
import type { MediaItem } from '@/types/media';
import type { Settings } from '@/types/settings';
import { isAppError } from '@/utils/errors';
import { sidecarFilename } from '@/utils/filename';
import { logger } from '@/utils/logger';
import { extensionFromUrl, isHttpUrl } from '@/utils/url';
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
  const settings = await getSettings();
  let skipped = 0;
  let alreadyDownloaded = 0;

  for (const [position, item] of items.entries()) {
    if (!item.downloadable || !isHttpUrl(item.url)) {
      skipped += 1;
      continue;
    }

    try {
      const record = await downloadService.enqueue({
        ...downloadSourceFromMediaItem(item),
        index: position + 1,
      });
      accepted.push({
        id: record.id,
        itemId: item.id,
        filename: record.filename,
        status: 'queued',
      });

      await enqueueSidecars(item, record, settings);
    } catch (error) {
      if (isAppError(error) && error.code === 'ALREADY_DOWNLOADED') {
        alreadyDownloaded += 1;
      } else {
        skipped += 1;
      }
    }
  }

  downloadService.start();
  return { accepted, skipped, alreadyDownloaded };
}

async function enqueueSidecars(
  item: MediaItem,
  record: DownloadRecord,
  settings: Settings,
): Promise<void> {
  if (
    settings.downloadThumbnails &&
    item.thumbnailUrl &&
    item.thumbnailUrl !== item.url
  ) {
    const thumbnailUrl = item.thumbnailUrl;
    const extension = extensionFromUrl(thumbnailUrl) ?? 'jpg';
    const mimeType =
      extension === 'png'
        ? 'image/png'
        : extension === 'webp'
          ? 'image/webp'
          : extension === 'avif'
            ? 'image/avif'
            : 'image/jpeg';

    await enqueueSidecar(
      item,
      record,
      'thumbnail',
      thumbnailUrl,
      sidecarFilename(record.filename, 'thumbnail', extension),
      {
        extension,
        mimeType,
        quality: 'source',
        label: `${extension.toUpperCase()} · Thumbnail`,
        converted: false,
      },
    );
  }

  if (settings.saveCaption && item.caption?.trim()) {
    const caption = item.caption.trim();
    const content = [
      caption,
      '',
      `Source: ${item.postUrl ?? item.sourcePageUrl ?? 'Unavailable'}`,
      item.publishedAt
        ? `Published: ${new Date(item.publishedAt).toISOString()}`
        : undefined,
    ]
      .filter((line): line is string => line !== undefined)
      .join('\n');

    await enqueueSidecar(
      item,
      record,
      'caption',
      textDataUrl(content, 'text/plain'),
      sidecarFilename(record.filename, 'caption', 'txt'),
      {
        extension: 'txt',
        mimeType: 'text/plain',
        quality: 'source',
        label: 'TXT · Caption',
        converted: false,
      },
    );
  }

  if (settings.saveMetadata) {
    const metadata = {
      platform: item.platform,
      mediaId: item.postId ?? item.id,
      author: item.author ?? null,
      mediaType: item.kind,
      caption: item.caption ?? null,
      location: item.location ?? null,
      sourceUrl: item.url,
      postUrl: item.postUrl ?? null,
      pageUrl: item.sourcePageUrl ?? null,
      publishedAt: item.publishedAt
        ? new Date(item.publishedAt).toISOString()
        : null,
      publicationDate: item.publishedAt
        ? new Date(item.publishedAt).toISOString().slice(0, 10)
        : null,
      downloadedAt: new Date().toISOString(),
      selectedImageFormat: settings.imageFormat,
      selectedVideoQuality: settings.videoQuality,
      actualOutput: record.output ?? null,
    };

    await enqueueSidecar(
      item,
      record,
      'metadata',
      textDataUrl(JSON.stringify(metadata, null, 2), 'application/json'),
      sidecarFilename(record.filename, 'metadata', 'json'),
      {
        extension: 'json',
        mimeType: 'application/json',
        quality: 'source',
        label: 'JSON · Metadata',
        converted: false,
      },
    );
  }
}

function sidecarSource(
  item: MediaItem,
  sidecar: DownloadSidecar,
  url: string,
): DownloadSource {
  return {
    id: `${item.id}:${sidecar}`,
    platform: item.platform,
    kind: 'image',
    url,
    author: item.author,
    caption: item.caption,
    postUrl: item.postUrl,
    sourcePageUrl: item.sourcePageUrl,
    publishedAt: item.publishedAt,
    pageType: item.pageType,
    location: item.location,
    collectionType: item.collectionType,
    collectionTitle: item.collectionTitle,
    sidecar,
  };
}

async function enqueueSidecar(
  item: MediaItem,
  record: DownloadRecord,
  sidecar: DownloadSidecar,
  url: string,
  filename: string,
  output: DownloadOutputInfo,
): Promise<void> {
  try {
    await downloadService.enqueue(sidecarSource(item, sidecar, url), {
      filename,
      output,
    });
  } catch (error) {
    logger.warn(
      `Could not queue the ${sidecar} sidecar for ${record.filename}.`,
      error instanceof Error ? error.message : 'Unknown error.',
    );
  }
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
