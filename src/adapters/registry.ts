import type { PlatformId } from '@/types/platform';
import { facebookAdapter } from './facebook';
import { instagramAdapter } from './instagram';
import { tiktokAdapter } from './tiktok';
import type { PlatformAdapter } from './types';

const adapters: readonly PlatformAdapter[] = [
  instagramAdapter,
  facebookAdapter,
  tiktokAdapter,
];

export function getAllAdapters(): readonly PlatformAdapter[] {
  return adapters;
}

export function getAdapterForUrl(url: URL): PlatformAdapter | undefined {
  return adapters.find((adapter) => adapter.matches(url));
}

export function getAdapterByPlatform(platform: PlatformId): PlatformAdapter | undefined {
  return adapters.find((adapter) => adapter.id === platform);
}
