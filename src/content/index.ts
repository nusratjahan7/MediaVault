import { getAdapterForUrl } from '@/adapters/registry';
import { findInPageTargets } from '@/content/buttons/find-targets';
import { selectItemsForTarget } from '@/content/buttons/media-selection';
import { sendToBackground } from '@/services/messaging';
import { getSettings, subscribeToSettings } from '@/storage/settings';
import type { InPageActionTarget } from '@/types/in-page';
import type { ContentResponse } from '@/types/messages';
import type { MediaItem, ScanResult } from '@/types/media';
import { toErrorPayload } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { startInPageActions, type InPageActionsController } from './in-page-actions';
import { startSpaObserver } from './observer';
import { scanPage } from './scanner';

const CACHE_TTL_MS = 2_000;
const DOWNLOAD_POLL_MS = 1_200;
const DOWNLOAD_WAIT_MS = 180_000;

let cachedScan: { href: string; at: number; result: ScanResult } | null = null;
let inPageActions: InPageActionsController | null = null;

function isScanRequest(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'SCAN_PAGE'
  );
}

function getScanResult(force = false): ScanResult {
  const href = window.location.href;
  const now = Date.now();

  if (
    !force &&
    cachedScan &&
    cachedScan.href === href &&
    now - cachedScan.at < CACHE_TTL_MS
  ) {
    return cachedScan.result;
  }

  const result = scanPage(document, new URL(href));
  cachedScan = { href, at: now, result };
  return result;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function currentTargets(): InPageActionTarget[] {
  return findInPageTargets(document, new URL(window.location.href));
}

function currentTargetCount(target: InPageActionTarget): number {
  return currentTargets().filter((candidate) => candidate.platform === target.platform)
    .length;
}

async function selectCandidates(target: InPageActionTarget): Promise<MediaItem[]> {
  let result = getScanResult(true);
  let items = selectItemsForTarget(target, result.items, currentTargetCount(target));

  if (items.some((item) => item.downloadable)) {
    return items;
  }

  // Video sources and embedded page data can appear a moment after the button.
  await delay(350);
  result = getScanResult(true);
  items = selectItemsForTarget(target, result.items, currentTargetCount(target));
  return items;
}

interface DownloadWaitResult {
  completed: number;
  failed: number;
  cancelled: number;
  timedOut: boolean;
  firstError?: string;
}

async function waitForDownloadJobs(ids: string[]): Promise<DownloadWaitResult> {
  const deadline = Date.now() + DOWNLOAD_WAIT_MS;
  let completed = 0;
  let failed = 0;
  let cancelled = 0;
  let firstError: string | undefined;

  while (Date.now() < deadline) {
    const response = await sendToBackground({ type: 'DOWNLOAD_STATUS', ids });
    if (!response.ok) {
      throw new Error(response.error.message);
    }

    completed = 0;
    failed = 0;
    cancelled = 0;
    firstError = undefined;
    let terminal = 0;

    for (const status of response.data.statuses) {
      if (status.state === 'completed') {
        completed += 1;
        terminal += 1;
      } else if (status.state === 'failed') {
        failed += 1;
        terminal += 1;
        firstError ??= status.error;
      } else if (status.state === 'cancelled') {
        cancelled += 1;
        terminal += 1;
      }
    }

    if (terminal === ids.length) {
      return { completed, failed, cancelled, timedOut: false, firstError };
    }

    await delay(DOWNLOAD_POLL_MS);
  }

  return { completed, failed, cancelled, timedOut: true, firstError };
}

async function downloadTarget(
  target: InPageActionTarget,
  setPhase: (phase: 'detecting' | 'downloading') => void,
): Promise<{ message: string; tone: 'success' | 'error' | 'info' }> {
  setPhase('detecting');
  const candidates = await selectCandidates(target);
  const downloadable = candidates.filter((item) => item.downloadable);

  if (candidates.length === 0) {
    return {
      message:
        target.kind === 'profile-picture'
          ? 'No accessible profile picture was found.'
          : 'No accessible media was found for this post or story.',
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

  if (accepted.length === 0) {
    if (alreadyDownloaded > 0) {
      return {
        message: 'Already downloaded — duplicate protection is enabled.',
        tone: 'info',
      };
    }

    return {
      message:
        skipped > 0
          ? 'No direct downloadable media was found for this item.'
          : 'Nothing to download.',
      tone: skipped > 0 ? 'error' : 'info',
    };
  }

  setPhase('downloading');
  const result = await waitForDownloadJobs(accepted.map((job) => job.id));

  if (result.timedOut) {
    return {
      message: 'Downloads are still running. Track them in the dashboard.',
      tone: 'info',
    };
  }

  if (result.failed > 0 || result.cancelled > 0) {
    return {
      message:
        result.firstError ??
        `${result.failed + result.cancelled} download${
          result.failed + result.cancelled === 1 ? '' : 's'
        } did not complete. Try again while the page is open.`,
      tone: 'error',
    };
  }

  const noun =
    target.kind === 'story'
      ? result.completed === 1
        ? 'story'
        : 'stories'
      : result.completed === 1
        ? 'item'
        : 'items';

  return {
    message: `Saved ${result.completed} ${noun}.`,
    tone: 'success',
  };
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

    if (!getAdapterForUrl(new URL(window.location.href))) {
      return;
    }

    inPageActions = startInPageActions({
      findTargets: currentTargets,
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
