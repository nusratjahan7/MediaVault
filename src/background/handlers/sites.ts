import {
  CONTENT_SCRIPT_FILE,
  CONTENT_SCRIPT_ID_PREFIX,
  PLATFORM_IDS,
  PLATFORM_META,
} from '@/constants';
import { getGrantedPlatforms, hasSitePermission } from '@/services/permissions';
import {
  addEnabledSite,
  getEnabledSites,
  removeEnabledSite,
  setEnabledSites,
} from '@/storage/sites';
import type { PlatformId, SiteStatus } from '@/types/platform';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

function contentScriptId(platform: PlatformId): string {
  return `${CONTENT_SCRIPT_ID_PREFIX}${platform}`;
}

async function ensureRegistered(platform: PlatformId): Promise<void> {
  const id = contentScriptId(platform);
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });

  if (existing.length > 0) {
    return;
  }

  await chrome.scripting.registerContentScripts([
    {
      id,
      matches: PLATFORM_META[platform].originPatterns,
      js: [CONTENT_SCRIPT_FILE],
      runAt: 'document_idle',
      persistAcrossSessions: true,
    },
  ]);
}

async function unregister(platform: PlatformId): Promise<void> {
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [contentScriptId(platform)] });
  } catch {
    // Nothing was registered for this platform.
  }
}

async function buildStatus(platform: PlatformId): Promise<SiteStatus> {
  const [enabledSites, permissionGranted] = await Promise.all([
    getEnabledSites(),
    hasSitePermission(platform),
  ]);

  return {
    platform,
    label: PLATFORM_META[platform].label,
    enabled: enabledSites.includes(platform) && permissionGranted,
    permissionGranted,
  };
}

export async function registerSite(
  platform: PlatformId,
  tabId?: number,
): Promise<SiteStatus> {
  const hasPermission = await hasSitePermission(platform);
  if (!hasPermission) {
    throw new AppError(
      'PERMISSION_DENIED',
      'Chrome has not granted access to this site. Enable it from the popup.',
    );
  }

  try {
    await ensureRegistered(platform);
  } catch {
    throw new AppError(
      'CONTENT_SCRIPT_FAILED',
      'Chrome could not enable MediaVault on this site. Reload the extension and try again.',
    );
  }

  await addEnabledSite(platform);

  if (tabId !== undefined) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [CONTENT_SCRIPT_FILE],
      });
    } catch {
      logger.warn('Immediate content script injection failed; scanning will retry.');
    }
  }

  return buildStatus(platform);
}

export async function unregisterSite(platform: PlatformId): Promise<SiteStatus> {
  await unregister(platform);
  await removeEnabledSite(platform);
  return buildStatus(platform);
}

export async function getSitesStatus(): Promise<SiteStatus[]> {
  const [enabledSites, granted] = await Promise.all([
    getEnabledSites(),
    getGrantedPlatforms(),
  ]);

  return PLATFORM_IDS.map((platform) => ({
    platform,
    label: PLATFORM_META[platform].label,
    enabled: enabledSites.includes(platform) && granted.includes(platform),
    permissionGranted: granted.includes(platform),
  }));
}

export async function reconcileSiteRegistrations(): Promise<void> {
  const [enabledSites, granted] = await Promise.all([
    getEnabledSites(),
    getGrantedPlatforms(),
  ]);

  const grantedEnabled = enabledSites.filter((platform) => granted.includes(platform));

  for (const platform of PLATFORM_IDS) {
    if (granted.includes(platform)) {
      if (!enabledSites.includes(platform)) {
        continue;
      }

      try {
        await ensureRegistered(platform);
      } catch (error) {
        logger.warn(
          `Could not register the ${platform} content script.`,
          error instanceof Error ? error.message : 'Unknown error.',
        );
      }
      continue;
    }

    await unregister(platform);
  }

  await setEnabledSites(grantedEnabled);
}
