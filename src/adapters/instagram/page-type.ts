import type { PageType } from '@/types/page';

const RESERVED_PROFILE_PATHS = new Set([
  'explore',
  'reels',
  'reel',
  'stories',
  'saved',
  'accounts',
  'direct',
  'p',
  'tv',
  'about',
  'legal',
  'developer',
  'directory',
  'challenge',
  'session',
]);

export function detectInstagramPageType(url: URL): PageType {
  const path = url.pathname;

  if (/^\/stories\/highlights\//.test(path)) {
    return 'highlight';
  }

  if (/^\/stories\//.test(path)) {
    return 'story';
  }

  if (/^\/(saved|collections)(\/|$)/.test(path) || /^\/[^/]+\/saved(\/|$)/.test(path)) {
    return 'saved';
  }

  if (/^\/explore\/tags\//.test(path) || /^\/[^/]+\/tagged\/?$/.test(path)) {
    return 'tagged';
  }

  if (/^\/p\/[^/]+/.test(path) || /^\/[^/]+\/p\/[^/]+/.test(path)) {
    return 'post';
  }

  if (/^\/(reel|reels)\/[^/]+/.test(path) || /^\/[^/]+\/reels?\/[^/]+/.test(path)) {
    return 'reel';
  }

  if (/^\/tv\/[^/]+/.test(path) || /^\/[^/]+\/tv\/[^/]+/.test(path)) {
    return 'video';
  }

  if (path === '/' || /^\/explore\/?$/.test(path) || /^\/reels\/?$/.test(path)) {
    return 'feed';
  }

  const profile = /^\/([A-Za-z0-9._]+)\/?$/.exec(path);
  if (profile?.[1] && !RESERVED_PROFILE_PATHS.has(profile[1].toLowerCase())) {
    return 'profile';
  }

  return 'unknown';
}
