import { dedupeMediaItems } from '@/adapters/shared/dom';
import { getAdapterForUrl } from '@/adapters/registry';
import { MAX_SCAN_ITEMS } from '@/constants';
import type { ScanResult } from '@/types/media';
import { AppError } from '@/utils/errors';

export function scanPage(document: Document, url: URL): ScanResult {
  const adapter = getAdapterForUrl(url);
  if (!adapter) {
    throw new AppError(
      'NOT_SUPPORTED',
      'MediaVault supports Instagram, Facebook, and TikTok pages.',
    );
  }

  const { items, limitations } = adapter.extract({ document, url });
  const deduped = dedupeMediaItems(items).slice(0, MAX_SCAN_ITEMS);

  return {
    platform: adapter.id,
    pageUrl: url.toString(),
    scannedAt: Date.now(),
    items: deduped,
    limitations,
  };
}
