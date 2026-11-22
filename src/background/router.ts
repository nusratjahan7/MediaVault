import type { ApiResponse, BackgroundRequest } from '@/types/messages';
import { toErrorPayload } from '@/utils/errors';
import { handleCancelDownload, handleDownloadItems } from './handlers/downloads';
import {
  handleHistoryClear,
  handleHistoryDelete,
  handleHistoryQuery,
} from './handlers/history';
import { handleScanTab } from './handlers/scan';
import { getSitesStatus, registerSite, unregisterSite } from './handlers/sites';

const REQUEST_TYPES = new Set<string>([
  'SCAN_TAB',
  'DOWNLOAD_ITEMS',
  'CANCEL_DOWNLOAD',
  'HISTORY_QUERY',
  'HISTORY_DELETE',
  'HISTORY_CLEAR',
  'SITES_STATUS',
  'SITES_REGISTER',
  'SITES_UNREGISTER',
]);

function isBackgroundRequest(value: unknown): value is BackgroundRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    REQUEST_TYPES.has((value as { type: string }).type)
  );
}

async function dispatch(request: BackgroundRequest): Promise<ApiResponse<unknown>> {
  try {
    switch (request.type) {
      case 'SCAN_TAB':
        return { ok: true, data: await handleScanTab(request) };
      case 'DOWNLOAD_ITEMS':
        return { ok: true, data: await handleDownloadItems(request) };
      case 'CANCEL_DOWNLOAD':
        return { ok: true, data: await handleCancelDownload(request) };
      case 'HISTORY_QUERY':
        return { ok: true, data: await handleHistoryQuery(request) };
      case 'HISTORY_DELETE':
        return { ok: true, data: await handleHistoryDelete(request) };
      case 'HISTORY_CLEAR':
        return { ok: true, data: await handleHistoryClear(request) };
      case 'SITES_STATUS':
        return { ok: true, data: await getSitesStatus() };
      case 'SITES_REGISTER':
        return { ok: true, data: await registerSite(request.platform, request.tabId) };
      case 'SITES_UNREGISTER':
        return { ok: true, data: await unregisterSite(request.platform) };
      default:
        return {
          ok: false,
          error: { code: 'INVALID_INPUT', message: 'Unknown MediaVault request.' },
        };
    }
  } catch (error) {
    return { ok: false, error: toErrorPayload(error) };
  }
}

export function registerBackgroundRouter(): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!isBackgroundRequest(message)) {
      return false;
    }

    if (sender.id !== chrome.runtime.id) {
      return false;
    }

    void dispatch(message).then(sendResponse);
    return true;
  });
}
