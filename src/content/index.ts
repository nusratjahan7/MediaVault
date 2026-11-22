import { getAdapterForUrl } from '@/adapters/registry';
import {
  findInstagramActionTargets,
  type InstagramActionTarget,
} from '@/adapters/instagram/in-page';
import { sendToBackground } from '@/services/messaging';
import { getSettings, subscribeToSettings } from '@/storage/settings';
import type { ContentResponse } from '@/types/messages';
import type { MediaItem, ScanResult } from '@/types/media';
import { toErrorPayload } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { startInPageActions, type InPageActionsController } from './in-page-actions';
import { startSpaObserver } from './observer';
import { scanPage } from './scanner';

const CACHE_TTL_MS = 2_000;

let cachedScan: { href: string; at: number; result: ScanResult } | null = null;
let inPageActions: InPageActionsController | null = null;

function isScanRequest(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'SCAN_PAGE'
  );
}

function getScanResult(): ScanResult {
  const href = window.location.href;
  const now = Date.now();

  if (cachedScan && cachedScan.href === href && now - cachedScan.at < CACHE_TTL_MS) {
    return cachedScan.result;
  }

  const result = scanPage(document, new URL(href));
  cachedScan = { href, at: now, result };
  return result;
}

function matchesTarget(item: MediaItem, target: InstagramActionTarget): boolean {
  if (!target.postUrl) {
    return false;
  }

  if (item.postUrl === target.postUrl) {
    return true;
  }

  if (!item.postId) {
    return false;
  }

  try {
    return new URL(target.postUrl).pathname.includes(item.postId);
  } catch {
    return false;
  }
}

function selectItemsForTarget(
  items: MediaItem[],
  target: InstagramActionTarget,
): MediaItem[] {
  if (target.kind === 'story') {
    return items;
  }

  const matched = target.postUrl
    ? items.filter((item) => matchesTarget(item, target))
    : [];

  if (matched.length > 0) {
    return matched;
  }

  // Single-post pages do not always expose a /p/ link inside the article.
  if (target.kind === 'post' && document.querySelectorAll('article').length <= 1) {
    return items;
  }

  return [];
}

async function downloadTarget(
  target: InstagramActionTarget,
): Promise<{ message: string; tone: 'success' | 'error' | 'info' }> {
  const discovery = getScanResult();
  const candidates = selectItemsForTarget(discovery.items, target);
  const downloadable = candidates.filter((item) => item.downloadable);

  if (candidates.length === 0) {
    return {
      message: 'No accessible media was found for this post.',
      tone: 'error',
    };
  }

  if (downloadable.length === 0) {
    return {
      message:
        candidates[0]?.unsupportedReason ??
        'This media has no direct file link that MediaVault can download.',
      tone: 'error',
    };
  }

  const response = await sendToBackground({
    type: 'DOWNLOAD_ITEMS',
    items: downloadable,
  });

  if (!response.ok) {
    return { message: response.error.message, tone: 'error' };
  }

  const { accepted, skipped, alreadyDownloaded } = response.data;

  if (accepted.length > 0) {
    return {
      message:
        target.kind === 'grid'
          ? `Added ${accepted.length} grid ${
              accepted.length === 1 ? 'image' : 'images'
            } to downloads. Open the post for original media.`
          : `Added ${accepted.length} ${
              accepted.length === 1 ? 'item' : 'items'
            } to downloads.`,
      tone: 'success',
    };
  }

  if (alreadyDownloaded > 0) {
    return {
      message: 'Already downloaded — Skip Downloaded is enabled.',
      tone: 'info',
    };
  }

  if (skipped > 0) {
    return {
      message: 'No direct downloadable media was found for this post.',
      tone: 'error',
    };
  }

  return { message: 'Nothing to download.', tone: 'info' };
}

async function initInPageActions(): Promise<void> {
  try {
    if (inPageActions) {
      return;
    }

    const settings = await getSettings();

    if (settings.demoMode) {
      return;
    }

    if (getAdapterForUrl(new URL(window.location.href))?.id !== 'instagram') {
      return;
    }

    inPageActions = startInPageActions({
      findTargets: () =>
        findInstagramActionTargets(document, new URL(window.location.href)),
      onDownload: downloadTarget,
    });

    inPageActions.refresh();
  } catch (error) {
    logger.warn(
      'Could not mount in-page actions.',
      error instanceof Error ? error.message : 'Unknown error.',
    );
  }
}

function bootstrap(): void {
  if (window.__mediaVaultInjected) {
    return;
  }

  window.__mediaVaultInjected = true;

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isScanRequest(message)) {
      return false;
    }

    try {
      const response: ContentResponse = { ok: true, data: getScanResult() };
      sendResponse(response);
    } catch (error) {
      logger.warn(
        'Page scan failed.',
        error instanceof Error ? error.message : 'Unknown scan error.',
      );
      const response: ContentResponse = { ok: false, error: toErrorPayload(error) };
      sendResponse(response);
    }

    return false;
  });

  startSpaObserver(() => {
    cachedScan = null;
    inPageActions?.refresh();
  });

  subscribeToSettings((settings) => {
    if (settings.demoMode) {
      inPageActions?.destroy();
      inPageActions = null;
      return;
    }

    if (!inPageActions) {
      void initInPageActions();
    }
  });

  void initInPageActions();
}

bootstrap();
