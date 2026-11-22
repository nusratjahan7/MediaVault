import type { ContentResponse } from '@/types/messages';
import type { ScanResult } from '@/types/media';
import { toErrorPayload } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { startSpaObserver } from './observer';
import { scanPage } from './scanner';

const CACHE_TTL_MS = 2_000;

let cachedScan: { href: string; at: number; result: ScanResult } | null = null;

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
  });
}

bootstrap();
