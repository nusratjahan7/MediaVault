import type { MediaItem } from '@/types/media';
import type { PlatformId } from '@/types/platform';

const KEY_PREFIX = 'mediavault:selection:v1:';
const MAX_STORED_ITEMS = 200;

interface SelectionEnvelope {
  version: 1;
  platform: PlatformId | null;
  items: MediaItem[];
  updatedAt: number;
}

function area(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

function keyForTab(tabId: number): string {
  return `${KEY_PREFIX}${tabId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStoredMedia(value: unknown): value is MediaItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.url === 'string' &&
    (value.kind === 'image' || value.kind === 'video') &&
    typeof value.platform === 'string' &&
    typeof value.downloadable === 'boolean'
  );
}

export async function getTabSelection(tabId: number): Promise<MediaItem[]> {
  try {
    const stored = await area().get(keyForTab(tabId));
    const value = stored[keyForTab(tabId)];
    if (!isRecord(value) || !Array.isArray(value.items)) {
      return [];
    }

    return value.items.filter(isStoredMedia).slice(0, MAX_STORED_ITEMS);
  } catch {
    return [];
  }
}

export async function saveTabSelection(
  tabId: number,
  platform: PlatformId | null,
  items: MediaItem[],
): Promise<void> {
  const key = keyForTab(tabId);

  try {
    if (items.length === 0) {
      await area().remove(key);
      return;
    }

    const envelope: SelectionEnvelope = {
      version: 1,
      platform,
      items: items.slice(0, MAX_STORED_ITEMS),
      updatedAt: Date.now(),
    };

    await area().set({ [key]: envelope });
  } catch {
    // Selection persistence is best-effort.
  }
}

export async function clearTabSelection(tabId: number): Promise<void> {
  try {
    await area().remove(keyForTab(tabId));
  } catch {
    // Best-effort.
  }
}
