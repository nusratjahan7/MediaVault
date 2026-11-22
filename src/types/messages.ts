import type { HistoryEntry, HistoryPage, HistoryQuery } from './history';
import type { EnqueueResult } from './download';
import type { ScanResult } from './media';
import type { PlatformId, SiteStatus } from './platform';

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiErrorPayload };

export interface ScanTabRequest {
  type: 'SCAN_TAB';
  tabId: number;
}

export interface DownloadItemsRequest {
  type: 'DOWNLOAD_ITEMS';
  items: ScanResult['items'];
}

export interface CancelDownloadRequest {
  type: 'CANCEL_DOWNLOAD';
  historyId: string;
}

export interface RetryDownloadRequest {
  type: 'RETRY_DOWNLOAD';
  historyId: string;
}

export interface PauseDownloadRequest {
  type: 'PAUSE_DOWNLOAD';
  historyId: string;
}

export interface ResumeDownloadRequest {
  type: 'RESUME_DOWNLOAD';
  historyId: string;
}

export interface HistoryQueryRequest {
  type: 'HISTORY_QUERY';
  query: HistoryQuery;
}

export interface HistoryDeleteRequest {
  type: 'HISTORY_DELETE';
  id: string;
}

export interface HistoryClearRequest {
  type: 'HISTORY_CLEAR';
}

export interface SitesStatusRequest {
  type: 'SITES_STATUS';
}

export interface SitesRegisterRequest {
  type: 'SITES_REGISTER';
  platform: PlatformId;
  tabId?: number;
}

export interface SitesUnregisterRequest {
  type: 'SITES_UNREGISTER';
  platform: PlatformId;
}

export type BackgroundRequest =
  | ScanTabRequest
  | DownloadItemsRequest
  | CancelDownloadRequest
  | RetryDownloadRequest
  | PauseDownloadRequest
  | ResumeDownloadRequest
  | HistoryQueryRequest
  | HistoryDeleteRequest
  | HistoryClearRequest
  | SitesStatusRequest
  | SitesRegisterRequest
  | SitesUnregisterRequest;

export interface BackgroundPayloadMap {
  SCAN_TAB: ScanResult;
  DOWNLOAD_ITEMS: EnqueueResult;
  CANCEL_DOWNLOAD: { cancelled: boolean };
  RETRY_DOWNLOAD: { retried: boolean };
  PAUSE_DOWNLOAD: { paused: boolean };
  RESUME_DOWNLOAD: { resumed: boolean };
  HISTORY_QUERY: HistoryPage;
  HISTORY_DELETE: { deleted: boolean };
  HISTORY_CLEAR: { cleared: number };
  SITES_STATUS: SiteStatus[];
  SITES_REGISTER: SiteStatus;
  SITES_UNREGISTER: SiteStatus;
}

export type BackgroundResponseMap = {
  [K in keyof BackgroundPayloadMap]: ApiResponse<BackgroundPayloadMap[K]>;
};

export type BackgroundResponse<T extends BackgroundRequest> = BackgroundResponseMap[T['type']];

export interface ScanPageRequest {
  type: 'SCAN_PAGE';
}

export type ContentRequest = ScanPageRequest;
export type ContentResponse = ApiResponse<ScanResult>;

export interface DownloadsUpdatedEvent {
  type: 'DOWNLOADS_UPDATED';
  entries: HistoryEntry[];
}

export type BackgroundEvent = DownloadsUpdatedEvent;
