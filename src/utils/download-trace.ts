import { logger } from '@/utils/logger';

/**
 * Development-only download pipeline tracing.
 *
 * Prints the stages needed to debug a failing download:
 * platform, media type, source type, filename, download id, error code, state.
 *
 * It never prints cookies, auth tokens, headers, captions, or account data,
 * and never prints the URL itself (signed CDN URLs carry credentials).
 *
 * Call sites are wrapped in `if (import.meta.env.DEV)` so production builds
 * drop the tracing entirely, including the event object construction.
 */

/** Whether a trace call is worth building an event object for. */
export const isDownloadTraceEnabled: boolean =
  import.meta.env.DEV && import.meta.env.VITE_DOWNLOAD_TRACE === '1';

export interface MediaStageEvent {
  stage: 'detect' | 'resolve';
  platform: string;
  mediaType: string;
  sourceType: string;
  downloadable: boolean;
  downloadStatus?: string;
  formatCount?: number;
  reasonCode?: string;
}

export interface DownloadStageEvent {
  stage: 'enqueue' | 'start' | 'progress' | 'finish';
  platform: string;
  mediaType: string;
  sourceType: string;
  filename?: string;
  downloadId?: number;
  state?: string;
  errorCode?: string;
  bytesReceived?: number;
  totalBytes?: number;
}

/**
 * Classifies a media URL by where the file comes from, without exposing the
 * URL itself. Paths and query strings are never logged because signed CDN URLs
 * carry short-lived credentials.
 */
export function describeSourceType(rawUrl: string | undefined): string {
  if (!rawUrl) {
    return 'none';
  }

  if (rawUrl.startsWith('data:')) {
    return 'data-url';
  }

  if (rawUrl.startsWith('blob:')) {
    return 'blob';
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    return 'other';
  }

  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    if (host.endsWith('cdninstagram.com') || host.endsWith('fbcdn.net')) {
      return 'platform-cdn';
    }
    if (
      host.endsWith('tiktokcdn.com') ||
      host.endsWith('tiktokcdn-us.com') ||
      host.endsWith('tiktokcdn-eu.com') ||
      host.endsWith('ibytedtos.com') ||
      host.endsWith('tiktok.com')
    ) {
      return 'tiktok-cdn';
    }
    return 'direct-http';
  } catch {
    return 'invalid-url';
  }
}

export function traceMediaStage(event: MediaStageEvent): void {
  logger.trace('[media]', {
    stage: event.stage,
    platform: event.platform,
    mediaType: event.mediaType,
    sourceType: event.sourceType,
    downloadable: event.downloadable,
    downloadStatus: event.downloadStatus,
    formatCount: event.formatCount,
    reasonCode: event.reasonCode,
  });
}

export function traceDownloadStage(event: DownloadStageEvent): void {
  logger.trace('[download]', {
    stage: event.stage,
    platform: event.platform,
    mediaType: event.mediaType,
    sourceType: event.sourceType,
    filename: event.filename,
    downloadId: event.downloadId,
    state: event.state,
    errorCode: event.errorCode,
    bytesReceived: event.bytesReceived,
    totalBytes: event.totalBytes,
  });
}
