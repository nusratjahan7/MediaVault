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
      if (/^\/stories\/highlights\//.test(url.pathname)) {
        return 'highlight';
      }
      if (/^\/stories\//.test(url.pathname)) {
        return 'story';
      }
      if (/^\/(saved|collections)\//.test(url.pathname) || /\/saved\/?$/.test(url.pathname)) {
        return 'saved';
      }
      if (/\/tagged\/?$/.test(url.pathname)) {
        return 'tagged';
      }
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
      if (/^\/stories\//.test(url.pathname)) {
        return 'story';
      }
      if (/^\/highlights?\//.test(url.pathname)) {
        return 'highlight';
      }
      if (url.searchParams.get('sk')?.toLowerCase() === 'saved') {
        return 'saved';
      }
      if (/tagged/i.test(url.pathname)) {
        return 'tagged';
      }
      if (
        /^\/(media\/set|photos\/album|album\.php)/.test(url.pathname) ||
        url.searchParams.get('sk')?.toLowerCase() === 'album'
      ) {
        return 'album';
      }
      if (
        /^\/reels?\//.test(url.pathname) ||
        url.pathname.startsWith('/share/r/')
      ) {
        return 'reel';
      }
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
      if (/\/@[^/]+\/favorites\/?$/.test(url.pathname)) {
        return 'saved';
      }
      if (/^\/tag\//.test(url.pathname)) {
        return 'tagged';
      }
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
    case 'album':
      return 'Album';
    case 'photo':
      return 'Photo';
    case 'profile':
      return 'Profile';
    case 'feed':
      return 'Feed';
    case 'story':
      return 'Story';
    case 'highlight':
      return 'Highlight';
    case 'tagged':
      return 'Tagged posts';
    case 'saved':
      return 'Saved collection';
    default:
      return 'Page';
  }
}
