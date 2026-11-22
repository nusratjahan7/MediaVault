import { AppError } from '@/utils/errors';

export async function startDownload(options: chrome.downloads.DownloadOptions): Promise<number> {
  try {
    return await chrome.downloads.download(options);
  } catch (error) {
    throw new AppError(
      'DOWNLOAD_FAILED',
      error instanceof Error && error.message
        ? error.message
        : 'Chrome could not start this download.',
    );
  }
}

export async function getDownload(
  downloadId: number,
): Promise<chrome.downloads.DownloadItem | undefined> {
  try {
    const results = await chrome.downloads.search({ id: downloadId });
    return results[0];
  } catch {
    return undefined;
  }
}

export async function cancelDownload(downloadId: number): Promise<void> {
  try {
    await chrome.downloads.cancel(downloadId);
  } catch {
    // The download may already have finished.
  }
}

export async function pauseDownload(downloadId: number): Promise<boolean> {
  if (typeof chrome.downloads.pause !== 'function') {
    return false;
  }

  try {
    await chrome.downloads.pause(downloadId);
    return true;
  } catch {
    return false;
  }
}

export async function resumeDownload(downloadId: number): Promise<boolean> {
  if (typeof chrome.downloads.resume !== 'function') {
    return false;
  }

  try {
    await chrome.downloads.resume(downloadId);
    return true;
  } catch {
    return false;
  }
}

export async function showDownload(downloadId: number): Promise<boolean> {
  try {
    await chrome.downloads.show(downloadId);
    return true;
  } catch {
    return false;
  }
}

export function onDownloadChanged(
  listener: (delta: chrome.downloads.DownloadDelta) => void,
): () => void {
  chrome.downloads.onChanged.addListener(listener);
  return () => chrome.downloads.onChanged.removeListener(listener);
}

export function describeDownloadError(errorCode?: string): string {
  switch (errorCode) {
    case 'NETWORK_FAILED':
    case 'NETWORK_TIMEOUT':
    case 'NETWORK_DISCONNECTED':
      return 'The media URL could not be reached. It may have expired — reload the page and scan again.';
    case 'SERVER_FORBIDDEN':
    case 'SERVER_UNAUTHORIZED':
      return 'The platform refused the download. The link may have expired — reload the page and scan again.';
    case 'SERVER_BAD_CONTENT':
    case 'SERVER_FAILED':
      return 'The platform returned an invalid response. Try scanning again.';
    case 'FILE_NO_SPACE':
      return "There isn't enough disk space to save this file.";
    case 'FILE_ACCESS_DENIED':
      return 'Chrome was not allowed to write this file. Check the download folder permissions.';
    case 'FILE_NAME_TOO_LONG':
      return 'The generated filename is too long. Shorten your filename template in settings.';
    case 'USER_CANCELED':
      return 'The download was cancelled.';
    case 'CRASH':
      return 'Chrome stopped the download unexpectedly. Try again.';
    default:
      return "Chrome couldn't complete this download. Try scanning again for a fresh link.";
  }
}
