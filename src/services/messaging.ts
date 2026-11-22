import { MESSAGE_TIMEOUT_MS, SCAN_TIMEOUT_MS } from '@/constants';
import type {
  BackgroundEvent,
  BackgroundRequest,
  BackgroundResponse,
  ContentRequest,
  ContentResponse,
  DownloadsUpdatedEvent,
} from '@/types/messages';
import { AppError } from '@/utils/errors';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AppError('TIMEOUT', `${label} did not respond in time. Please try again.`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function sendToBackground<T extends BackgroundRequest>(
  request: T,
  timeoutMs = MESSAGE_TIMEOUT_MS,
): Promise<BackgroundResponse<T>> {
  const promise = new Promise<BackgroundResponse<T>>((resolve, reject) => {
    chrome.runtime.sendMessage(request, (response: BackgroundResponse<T> | undefined) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(
          new AppError(
            'MESSAGE_FAILED',
            lastError.message ?? 'The MediaVault service worker is unavailable.',
          ),
        );
        return;
      }

      if (!response) {
        reject(
          new AppError(
            'MESSAGE_FAILED',
            'MediaVault did not respond. Reload the extension and try again.',
          ),
        );
        return;
      }

      resolve(response);
    });
  });

  return withTimeout(promise, timeoutMs, 'The MediaVault service worker');
}

export function sendToTab(
  tabId: number,
  request: ContentRequest,
  timeoutMs = SCAN_TIMEOUT_MS,
): Promise<ContentResponse> {
  const promise = new Promise<ContentResponse>((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, request, (response: ContentResponse | undefined) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(
          new AppError(
            'CONTENT_SCRIPT_FAILED',
            'MediaVault could not reach this page. Reload it, then try again.',
          ),
        );
        return;
      }

      if (!response) {
        reject(
          new AppError(
            'CONTENT_SCRIPT_FAILED',
            'This page did not respond. Reload it, then try again.',
          ),
        );
        return;
      }

      resolve(response);
    });
  });

  return withTimeout(promise, timeoutMs, 'The page');
}

export function broadcastEvent(event: BackgroundEvent): void {
  try {
    chrome.runtime.sendMessage(event, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // No extension pages are open; nothing to notify.
  }
}

export function isDownloadsUpdatedEvent(value: unknown): value is DownloadsUpdatedEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'DOWNLOADS_UPDATED' &&
    Array.isArray((value as { entries?: unknown }).entries)
  );
}
