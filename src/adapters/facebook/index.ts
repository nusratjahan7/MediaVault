import { PLATFORM_META } from '@/constants';
import { matchesAnyHost } from '@/utils/url';
import type { PlatformAdapter } from '../types';
import { extractFacebook } from './extract';

export const facebookAdapter: PlatformAdapter = {
  id: 'facebook',
  matches: (url) => matchesAnyHost(url, PLATFORM_META.facebook.hostnames),
  extract: extractFacebook,
};
