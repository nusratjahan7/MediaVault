import { PLATFORM_META } from '@/constants';
import { matchesAnyHost } from '@/utils/url';
import type { PlatformAdapter } from '../types';
import { extractInstagram } from './extract';

export const instagramAdapter: PlatformAdapter = {
  id: 'instagram',
  matches: (url) => matchesAnyHost(url, PLATFORM_META.instagram.hostnames),
  extract: extractInstagram,
};
