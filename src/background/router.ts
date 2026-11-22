import { runRequest } from '@/services/error-handler';
import type { ApiResponse, BackgroundRequest } from '@/types/messages';
import { AppError } from '@/utils/errors';
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
  return runRequest(request, async () => {
    switch (request.type) {
      case 'SCAN_TAB':
        return handleScanTab(request);
      case 'DOWNLOAD_ITEMS':
        return handleDownloadItems(request);
      case 'CANCEL_DOWNLOAD':
        return handleCancelDownload(request);
      case 'HISTORY_QUERY':
        return handleHistoryQuery(request);
      case 'HISTORY_DELETE':
        return handleHistoryDelete(request);
      case 'HISTORY_CLEAR':
        return handleHistoryClear(request);
      case 'SITES_STATUS':
        return getSitesStatus();
      case 'SITES_REGISTER':
        return registerSite(request.platform, request.tabId);
      case 'SITES_UNREGISTER':
        return unregisterSite(request.platform);
      default:
        throw new AppError('INVALID_INPUT', 'Unknown MediaVault request.');
    }
  });
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
