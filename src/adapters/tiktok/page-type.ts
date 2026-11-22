import type { PageType } from '@/types/page';

export function detectTikTokPageType(url: URL): PageType {
  const path = url.pathname.toLowerCase();

  if (/\/@[^/]+\/(video)\/[^/]+/.test(path)) {
    return 'video';
  }

  if (/\/@[^/]+\/(photo)\/[^/]+/.test(path)) {
    return 'post';
  }

  if (/^\/@[^/]+\/favorites\/?$/.test(path)) {
    return 'saved';
  }

  if (/^\/tag\//.test(path)) {
    return 'tagged';
  }

  if (/\/(story|stories)\//.test(path)) {
    return 'story';
  }

  if (path === '/' || /^\/(foryou|following|explore)\/?$/.test(path)) {
    return 'feed';
  }

  if (/^\/@[^/]+\/?$/.test(path) || /\/@[^/]+\/?$/.test(path)) {
    return 'profile';
  }

  return 'unknown';
}
