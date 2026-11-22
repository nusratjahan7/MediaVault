import { MAX_SCAN_ITEMS, PLATFORM_IDS } from '@/constants';
import { runRequest } from '@/services/error-handler';
import type { ApiResponse, BackgroundRequest } from '@/types/messages';
import { AppError } from '@/utils/errors';
import {
  handleCancelDownload,
  handleDownloadItems,
  handlePauseDownload,
  handleResumeDownload,
  handleRetryDownload,
} from './handlers/downloads';
import {
  handleDashboardClearCompleted,
  handleDashboardQuery,
} from './handlers/dashboard';
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
  'RETRY_DOWNLOAD',
  'PAUSE_DOWNLOAD',
  'RESUME_DOWNLOAD',
  'HISTORY_QUERY',
  'HISTORY_DELETE',
  'HISTORY_CLEAR',
  'DASHBOARD_QUERY',
  'DASHBOARD_CLEAR_COMPLETED',
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 300;
}

function validPlatform(value: unknown): boolean {
  return typeof value === 'string' && PLATFORM_IDS.includes(value as never);
}

function validateRequest(request: BackgroundRequest): void {
  const fail = (message: string): never => {
    throw new AppError('INVALID_INPUT', message);
  };

  switch (request.type) {
    case 'SCAN_TAB':
      if (!Number.isInteger(request.tabId) || request.tabId <= 0) {
        fail('A valid tab id is required.');
      }
      return;
    case 'DOWNLOAD_ITEMS':
      if (
        !Array.isArray(request.items) ||
        request.items.length === 0 ||
        request.items.length > MAX_SCAN_ITEMS
      ) {
        fail('A valid media selection is required.');
      }
      for (const item of request.items as unknown[]) {
        if (
          !isRecord(item) ||
          !validId(item.id) ||
          !validPlatform(item.platform) ||
          (item.kind !== 'image' && item.kind !== 'video') ||
          typeof item.url !== 'string' ||
          typeof item.downloadable !== 'boolean'
        ) {
          fail('The media selection contains an invalid item.');
        }
      }
      return;
    case 'CANCEL_DOWNLOAD':
    case 'RETRY_DOWNLOAD':
    case 'PAUSE_DOWNLOAD':
    case 'RESUME_DOWNLOAD':
      if (!validId(request.historyId)) {
        fail('A valid download id is required.');
      }
      return;
    case 'HISTORY_DELETE':
      if (!validId(request.id)) {
        fail('A valid history id is required.');
      }
      return;
    case 'HISTORY_QUERY':
      if (!isRecord(request.query)) {
        fail('A valid history query is required.');
      }
      return;
    case 'SITES_REGISTER':
      if (!validPlatform(request.platform)) {
        fail('A supported platform is required.');
      }
      if (
        request.tabId !== undefined &&
        (!Number.isInteger(request.tabId) || request.tabId <= 0)
      ) {
        fail('A valid tab id is required.');
      }
      return;
    case 'SITES_UNREGISTER':
      if (!validPlatform(request.platform)) {
        fail('A supported platform is required.');
      }
      return;
    case 'HISTORY_CLEAR':
    case 'DASHBOARD_QUERY':
    case 'DASHBOARD_CLEAR_COMPLETED':
    case 'SITES_STATUS':
      return;
  }
}

async function dispatch(request: BackgroundRequest): Promise<ApiResponse<unknown>> {
  return runRequest(request, async () => {
    validateRequest(request);

    switch (request.type) {
      case 'SCAN_TAB':
        return handleScanTab(request);
      case 'DOWNLOAD_ITEMS':
        return handleDownloadItems(request);
      case 'CANCEL_DOWNLOAD':
        return handleCancelDownload(request);
      case 'RETRY_DOWNLOAD':
        return handleRetryDownload(request);
      case 'PAUSE_DOWNLOAD':
        return handlePauseDownload(request);
      case 'RESUME_DOWNLOAD':
        return handleResumeDownload(request);
      case 'HISTORY_QUERY':
        return handleHistoryQuery(request);
      case 'HISTORY_DELETE':
        return handleHistoryDelete(request);
      case 'HISTORY_CLEAR':
        return handleHistoryClear(request);
      case 'DASHBOARD_QUERY':
        return handleDashboardQuery();
      case 'DASHBOARD_CLEAR_COMPLETED':
        return handleDashboardClearCompleted();
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
