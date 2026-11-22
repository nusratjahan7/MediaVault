import { initDownloadQueue } from '@/downloads/queue';
import { subscribeToSettings } from '@/storage/settings';
import { logger } from '@/utils/logger';
import { reconcileSiteRegistrations } from './handlers/sites';
import { registerBackgroundRouter } from './router';

registerBackgroundRouter();

// Keep the service worker's settings cache in sync with the options page.
subscribeToSettings(() => undefined);

let bootstrapPromise: Promise<void> | null = null;

function bootstrap(): Promise<void> {
  bootstrapPromise ??= Promise.allSettled([
    reconcileSiteRegistrations(),
    initDownloadQueue(),
  ]).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') {
        logger.warn('Background bootstrap step failed.', result.reason);
      }
    }
  });

  return bootstrapPromise;
}

chrome.runtime.onInstalled.addListener(() => {
  void bootstrap();
});

chrome.runtime.onStartup.addListener(() => {
  void bootstrap();
});

chrome.permissions.onRemoved.addListener(() => {
  void reconcileSiteRegistrations();
});

void bootstrap();
