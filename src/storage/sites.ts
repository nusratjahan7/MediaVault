import { PLATFORM_IDS, SITES_STORAGE_KEY } from '@/constants';
import type { PlatformId } from '@/types/platform';

interface SitesEnvelope {
  version: number;
  platforms: PlatformId[];
}

const VALID_PLATFORMS = new Set<PlatformId>(PLATFORM_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePlatforms(value: unknown): PlatformId[] {
  if (!isRecord(value) || !Array.isArray(value.platforms)) {
    return [];
  }

  const unique = new Set<PlatformId>();
  for (const item of value.platforms) {
    if (typeof item === 'string' && VALID_PLATFORMS.has(item as PlatformId)) {
      unique.add(item as PlatformId);
    }
  }

  return [...unique];
}

export async function getEnabledSites(): Promise<PlatformId[]> {
  const stored = await chrome.storage.local.get(SITES_STORAGE_KEY);
  return parsePlatforms(stored[SITES_STORAGE_KEY]);
}

export async function setEnabledSites(platforms: PlatformId[]): Promise<PlatformId[]> {
  const unique = [...new Set(platforms)].filter((platform) => VALID_PLATFORMS.has(platform));
  const envelope: SitesEnvelope = { version: 1, platforms: unique };
  await chrome.storage.local.set({ [SITES_STORAGE_KEY]: envelope });
  return unique;
}

export async function addEnabledSite(platform: PlatformId): Promise<PlatformId[]> {
  const current = await getEnabledSites();
  if (current.includes(platform)) {
    return current;
  }

  return setEnabledSites([...current, platform]);
}

export async function removeEnabledSite(platform: PlatformId): Promise<PlatformId[]> {
  const current = await getEnabledSites();
  return setEnabledSites(current.filter((entry) => entry !== platform));
}
