import type { PlatformId } from '@/types/platform';
import type { PreviewAccount } from '@/types/ui';

export const MOCK_ACCOUNTS: PreviewAccount[] = [
  {
    id: 'ig-maya',
    platform: 'instagram',
    displayName: 'Maya Chen',
    handle: 'maya.chen',
    accountType: 'Personal',
    initials: 'MC',
    accent: '#7C5CFC',
    followersLabel: '12.4K followers',
  },
  {
    id: 'ig-north',
    platform: 'instagram',
    displayName: 'North Studio',
    handle: 'studio.north',
    accountType: 'Creator',
    initials: 'NS',
    accent: '#E1306C',
    followersLabel: '184K followers',
  },
  {
    id: 'ig-lumen',
    platform: 'instagram',
    displayName: 'Lumen Gallery',
    handle: 'lumen.gallery',
    accountType: 'Business',
    initials: 'LG',
    accent: '#F59E0B',
    followersLabel: '48.2K followers',
  },
  {
    id: 'fb-lumen',
    platform: 'facebook',
    displayName: 'Lumen Gallery',
    handle: 'lumengallery',
    accountType: 'Page',
    initials: 'LG',
    accent: '#3B82F6',
    followersLabel: '22K followers',
  },
  {
    id: 'fb-atlas',
    platform: 'facebook',
    displayName: 'Atlas Films',
    handle: 'atlasfilms',
    accountType: 'Creator',
    initials: 'AF',
    accent: '#0EA5E9',
    followersLabel: '97K followers',
  },
  {
    id: 'fb-maya',
    platform: 'facebook',
    displayName: 'Maya Chen',
    handle: 'maya.chen',
    accountType: 'Personal',
    initials: 'MC',
    accent: '#8B5CF6',
    followersLabel: '1.8K friends',
  },
  {
    id: 'tt-north',
    platform: 'tiktok',
    displayName: 'North Studio',
    handle: 'studio.north',
    accountType: 'Creator',
    initials: 'NS',
    accent: '#EC4899',
    followersLabel: '310K followers',
  },
  {
    id: 'tt-maya',
    platform: 'tiktok',
    displayName: 'Maya Creates',
    handle: 'mayacreates',
    accountType: 'Personal',
    initials: 'MC',
    accent: '#22D3EE',
    followersLabel: '54K followers',
  },
  {
    id: 'tt-lumen',
    platform: 'tiktok',
    displayName: 'Lumen Gallery',
    handle: 'lumen.gallery',
    accountType: 'Business',
    initials: 'LG',
    accent: '#F59E0B',
    followersLabel: '81K followers',
  },
];

export const DEFAULT_PREVIEW_ACCOUNT_IDS: Record<PlatformId, string> = {
  instagram: 'ig-north',
  facebook: 'fb-atlas',
  tiktok: 'tt-north',
};

export function getMockAccounts(platform?: PlatformId): PreviewAccount[] {
  return platform ? MOCK_ACCOUNTS.filter((account) => account.platform === platform) : MOCK_ACCOUNTS;
}

export function findMockAccount(
  platform: PlatformId,
  accountId: string,
): PreviewAccount | undefined {
  return MOCK_ACCOUNTS.find(
    (account) => account.platform === platform && account.id === accountId,
  );
}

export function getDefaultPreviewAccount(platform: PlatformId): PreviewAccount {
  const accounts = getMockAccounts(platform);
  const account =
    accounts.find((entry) => entry.id === DEFAULT_PREVIEW_ACCOUNT_IDS[platform]) ?? accounts[0];

  if (!account) {
    throw new Error(`No preview account data exists for ${platform}.`);
  }

  return account;
}
