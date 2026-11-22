import type { PageType } from '@/types/page';

const RESERVED_PROFILE_PATHS = new Set([
  'watch',
  'reel',
  'reels',
  'videos',
  'video.php',
  'photo',
  'photos',
  'photo.php',
  'posts',
  'permalink',
  'permalink.php',
  'story.php',
  'stories',
  'saved',
  'groups',
  'marketplace',
  'gaming',
  'events',
  'friends',
  'settings',
  'notifications',
  'messages',
  'help',
  'login',
  'recover',
  'search',
  'hashtag',
  'home.php',
  'profile.php',
  'people',
  'pages',
]);

export function detectFacebookPageType(url: URL): PageType {
  const path = url.pathname.toLowerCase();
  const sk = url.searchParams.get('sk')?.toLowerCase() ?? '';

  if (/^\/stories\//.test(path)) {
    return 'story';
  }

  if (/^\/highlights?\//.test(path)) {
    return 'highlight';
  }

  if (sk === 'saved' || /^\/saved(\/|$)/.test(path)) {
    return 'saved';
  }

  if (
    sk === 'tagged' ||
    sk === 'photos_of' ||
    /photos_tagged|_tagged/.test(path)
  ) {
    return 'tagged';
  }

  if (
    /^\/(media\/set|photos\/album|album\.php)(\/|$)/.test(path) ||
    sk === 'album'
  ) {
    return 'album';
  }

  if (/^\/reels?\//.test(path) || path.startsWith('/share/r/')) {
    return 'reel';
  }

  if (
    /^\/(watch|videos|video\.php)(\/|$)/.test(path) ||
    path.startsWith('/share/v/')
  ) {
    return 'video';
  }

  if (
    /^\/(photo|photos|photo\.php|permalink|permalink\.php|posts|story\.php)(\/|$)/.test(
      path,
    )
  ) {
    return 'post';
  }

  if (path === '/' || path === '/home.php') {
    return 'feed';
  }

  if (/^\/(profile\.php|people|pages)(\/|$)/.test(path)) {
    return 'profile';
  }

  const profile = /^\/([^/]+)\/?$/.exec(path);
  if (profile?.[1] && !RESERVED_PROFILE_PATHS.has(profile[1])) {
    return 'profile';
  }

  return 'unknown';
}
