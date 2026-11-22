import type { PageKind } from '@/types/ui';

const INSTAGRAM_REEL = /^\/(reel|reels)\//;
const INSTAGRAM_POST = /^\/(p|tv)\//;
const FACEBOOK_VIDEO = /^\/(watch|reel|videos|video\.php)/;
const FACEBOOK_PHOTO = /^\/(photo|photos)/;
const TIKTOK_VIDEO = /\/video\//;
const TIKTOK_PHOTO = /\/photo\//;
const PROFILE = /^\/(@[^/]+|[A-Za-z0-9._]+)\/?$/;

export function inferPageKind(url: URL): PageKind {
  switch (url.hostname.replace(/^www\./, '')) {
    case 'instagram.com':
      if (INSTAGRAM_REEL.test(url.pathname)) {
        return 'reel';
      }
      if (INSTAGRAM_POST.test(url.pathname)) {
        return 'post';
      }
      if (PROFILE.test(url.pathname)) {
        return 'profile';
      }
      return 'feed';
    case 'facebook.com':
      if (FACEBOOK_VIDEO.test(url.pathname)) {
        return 'video';
      }
      if (FACEBOOK_PHOTO.test(url.pathname)) {
        return 'photo';
      }
      if (url.pathname === '/' || url.pathname === '/home.php') {
        return 'feed';
      }
      return 'post';
    case 'tiktok.com':
      if (TIKTOK_VIDEO.test(url.pathname)) {
        return 'video';
      }
      if (TIKTOK_PHOTO.test(url.pathname)) {
        return 'photo';
      }
      if (url.pathname.startsWith('/@')) {
        return 'profile';
      }
      return 'feed';
    default:
      return 'unknown';
  }
}

export function pageKindLabel(kind: PageKind): string {
  switch (kind) {
    case 'post':
      return 'Post';
    case 'reel':
      return 'Reel';
    case 'video':
      return 'Video';
    case 'photo':
      return 'Photo';
    case 'profile':
      return 'Profile';
    case 'feed':
      return 'Feed';
    default:
      return 'Page';
  }
}
