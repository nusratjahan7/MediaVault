import { getAdapterForUrl } from '@/adapters/registry';
import { CONTENT_SCRIPT_FILE } from '@/constants';
import { sendToTab } from '@/services/messaging';
import { hasSitePermission } from '@/services/permissions';
import type { ScanResult } from '@/types/media';
import type { ScanTabRequest } from '@/types/messages';
import { AppError, fromErrorPayload } from '@/utils/errors';
import { safeUrl } from '@/utils/url';

export async function handleScanTab({ tabId }: ScanTabRequest): Promise<ScanResult> {
  let tab: chrome.tabs.Tab;

  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    throw new AppError('TAB_UNAVAILABLE', 'This tab is no longer available.');
  }

  const url = safeUrl(tab.url);
  if (!url) {
    throw new AppError('NOT_SUPPORTED', 'MediaVault cannot read this tab.');
  }

  const adapter = getAdapterForUrl(url);
  if (!adapter) {
    throw new AppError(
      'NOT_SUPPORTED',
      'MediaVault supports Instagram, Facebook, and TikTok pages.',
    );
  }

  const hasPermission = await hasSitePermission(adapter.id);
  if (!hasPermission) {
    throw new AppError(
      'PERMISSION_DENIED',
      'Site access is not enabled. Enable this site from the MediaVault popup first.',
    );
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT_FILE],
    });
  } catch {
    throw new AppError(
      'CONTENT_SCRIPT_FAILED',
      'MediaVault could not reach this page. Reload it, then scan again.',
    );
  }

  const response = await sendToTab(tabId, { type: 'SCAN_PAGE' });
  if (!response.ok) {
    throw fromErrorPayload(response.error);
  }

  return response.data;
}
