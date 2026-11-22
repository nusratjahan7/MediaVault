import { PLATFORM_IDS, PREVIEW_ACCOUNTS_STORAGE_KEY } from '@/constants';
import type { PlatformId } from '@/types/platform';
import type { PreviewAccount } from '@/types/ui';
import {
  findMockAccount,
  getDefaultPreviewAccount,
  getMockAccounts,
} from './accounts';

export type SelectedPreviewAccounts = Partial<Record<PlatformId, string>>;

interface PreviewEnvelope {
  version: 1;
  selected: SelectedPreviewAccounts;
}

const VALID_PLATFORMS = new Set<PlatformId>(PLATFORM_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEnvelope(value: unknown): SelectedPreviewAccounts {
  if (!isRecord(value) || !isRecord(value.selected)) {
    return {};
  }

  const selected: SelectedPreviewAccounts = {};

  for (const [platform, accountId] of Object.entries(value.selected)) {
    if (
      VALID_PLATFORMS.has(platform as PlatformId) &&
      typeof accountId === 'string' &&
      findMockAccount(platform as PlatformId, accountId)
    ) {
      selected[platform as PlatformId] = accountId;
    }
  }

  return selected;
}

export async function getSelectedPreviewAccounts(): Promise<SelectedPreviewAccounts> {
  try {
    const stored = await chrome.storage.local.get(PREVIEW_ACCOUNTS_STORAGE_KEY);
    return parseEnvelope(stored[PREVIEW_ACCOUNTS_STORAGE_KEY]);
  } catch {
    return {};
  }
}

export async function getSelectedPreviewAccount(platform: PlatformId): Promise<PreviewAccount> {
  const selected = await getSelectedPreviewAccounts();
  const accountId = selected[platform];

  return (
    (accountId ? findMockAccount(platform, accountId) : undefined) ??
    getDefaultPreviewAccount(platform)
  );
}

export async function selectPreviewAccount(
  platform: PlatformId,
  accountId: string,
): Promise<PreviewAccount> {
  const account = findMockAccount(platform, accountId);
  if (!account) {
    throw new Error('That preview account is not available.');
  }

  const selected = await getSelectedPreviewAccounts();
  const envelope: PreviewEnvelope = {
    version: 1,
    selected: { ...selected, [platform]: account.id },
  };

  await chrome.storage.local.set({ [PREVIEW_ACCOUNTS_STORAGE_KEY]: envelope });
  return account;
}

export function subscribeToPreviewAccounts(
  listener: (selected: SelectedPreviewAccounts) => void,
): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== 'local') {
      return;
    }

    const change = changes[PREVIEW_ACCOUNTS_STORAGE_KEY];
    if (change) {
      listener(parseEnvelope(change.newValue));
    }
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export function getAllMockAccountsFor(platform: PlatformId): PreviewAccount[] {
  return getMockAccounts(platform);
}
