import { PLATFORM_META } from '@/constants';
import { matchesAnyHost } from '@/utils/url';
import type { PlatformAdapter } from '../types';
import { extractTikTok } from './extract';

export const tiktokAdapter: PlatformAdapter = {
  id: 'tiktok',
  matches: (url) => matchesAnyHost(url, PLATFORM_META.tiktok.hostnames),
  extract: extractTikTok,
};
