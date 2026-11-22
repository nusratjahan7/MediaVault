import type { AccountIdentity } from '@/types/page';
import { safeUrl } from '@/utils/url';
import { ogContent } from '../shared/dom';

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

export function identifyFacebookAccount(document: Document): AccountIdentity | null {
  const authorLink = document.querySelector<HTMLAnchorElement>(
    'h2 a[role="link"][href], h3 a[role="link"][href], strong a[role="link"][href], [role="article"] h2 a[href]',
  );

  const articleAuthor = authorLink?.textContent?.trim();
  const ogTitle = ogContent(document, 'og:title')
    ?.replace(/\s*[|-]\s*Facebook\s*$/i, '')
    .trim();

  const displayName =
    articleAuthor && articleAuthor.length <= 80
      ? articleAuthor
      : ogTitle && ogTitle.length <= 80
        ? ogTitle
        : undefined;

  let username: string | undefined;
  let profileUrl: string | undefined;
  const href = authorLink?.getAttribute('href');

  if (href) {
    const resolved = safeUrl(href, 'https://www.facebook.com');
    if (resolved) {
      profileUrl = resolved.toString();
      if (resolved.pathname !== '/profile.php') {
        const segment = resolved.pathname.split('/').filter(Boolean)[0];
        if (segment && !RESERVED_PROFILE_PATHS.has(segment.toLowerCase())) {
          username = decodeURIComponent(segment);
        }
      }
    }
  }

  if (!username && !displayName) {
    return null;
  }

  return {
    platform: 'facebook',
    username,
    displayName: displayName ?? username,
    profileUrl,
    isPageOwner: false,
  };
}
