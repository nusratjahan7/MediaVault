import {
  MEDIA_PROCESSING_ORIGINS,
  PLATFORM_IDS,
  PLATFORM_META,
} from '@/constants';
import type { PlatformId, SiteStatus } from '@/types/platform';
import { AppError, fromErrorPayload } from '@/utils/errors';
import { sendToBackground } from './messaging';

export async function hasSitePermission(platform: PlatformId): Promise<boolean> {
  try {
    return await chrome.permissions.contains({
      origins: PLATFORM_META[platform].originPatterns,
    });
  } catch {
    return false;
  }
}

export async function hasMediaProcessingAccess(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ origins: MEDIA_PROCESSING_ORIGINS });
  } catch {
    return false;
  }
}

export async function requestMediaProcessingAccess(): Promise<boolean> {
  try {
    return await chrome.permissions.request({ origins: MEDIA_PROCESSING_ORIGINS });
  } catch {
    return false;
  }
}

export async function getGrantedPlatforms(): Promise<PlatformId[]> {
  try {
    const permissions = await chrome.permissions.getAll();
    const origins = permissions.origins ?? [];

    return PLATFORM_IDS.filter((platform) =>
      PLATFORM_META[platform].originPatterns.some((pattern) => origins.includes(pattern)),
    );
  } catch {
    return [];
  }
}

export async function getSiteStatuses(): Promise<SiteStatus[]> {
  const response = await sendToBackground({ type: 'SITES_STATUS' });
  if (!response.ok) {
    throw fromErrorPayload(response.error);
  }

  return response.data;
}

export async function requestSiteAccess(
  platform: PlatformId,
  tabId?: number,
): Promise<SiteStatus> {
  let granted = false;

  try {
    granted = await chrome.permissions.request({
      origins: PLATFORM_META[platform].originPatterns,
    });
  } catch {
    throw new AppError(
      'PERMISSION_DENIED',
      'Chrome could not grant access to this site. Try enabling it again from the popup.',
    );
  }

  if (!granted) {
    throw new AppError(
      'PERMISSION_DENIED',
      'Site access was not granted. MediaVault needs permission to scan the page you choose.',
    );
  }

  const response = await sendToBackground({
    type: 'SITES_REGISTER',
    platform,
    ...(tabId !== undefined ? { tabId } : {}),
  });

  if (!response.ok) {
    throw fromErrorPayload(response.error);
  }

  return response.data;
}

export async function revokeSiteAccess(platform: PlatformId): Promise<SiteStatus> {
  const response = await sendToBackground({ type: 'SITES_UNREGISTER', platform });
  if (!response.ok) {
    throw fromErrorPayload(response.error);
  }

  try {
    await chrome.permissions.remove({
      origins: PLATFORM_META[platform].originPatterns,
    });
  } catch {
    throw new AppError(
      'PERMISSION_DENIED',
      'Chrome could not revoke access. You can also manage site access in chrome://extensions.',
    );
  }

  return response.data;
}
