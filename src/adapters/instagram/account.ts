import type { AccountIdentity } from '@/types/page';
import { ogContent } from '../shared/dom';

const RESERVED_USERNAMES = new Set([
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
]);

export function identifyInstagramAccount(document: Document): AccountIdentity | null {
  const ogTitle = ogContent(document, 'og:title');
  let username = ogTitle?.match(/\(@([A-Za-z0-9._]+)\)/)?.[1];

  if (!username) {
    const twitterCreator = document
      .querySelector<HTMLMetaElement>('meta[name="twitter:creator"]')
      ?.content?.trim();
    username = twitterCreator?.replace(/^@/, '');
  }

  if (!username) {
    const href = document
      .querySelector<HTMLAnchorElement>(
        'article header a[href^="/"], main header a[href^="/"]',
      )
      ?.getAttribute('href');
    const segment = href?.split('/').filter(Boolean)[0];

    if (segment && !RESERVED_USERNAMES.has(segment.toLowerCase())) {
      username = segment;
    }
  }

  if (!username) {
    return null;
  }

  const displayName =
    ogTitle?.replace(/\s*\(@[^)]*\).*$/u, '').replace(/\s*•.*$/u, '').trim() || undefined;

  return {
    platform: 'instagram',
    username,
    displayName: displayName || username,
    profileUrl: `https://www.instagram.com/${username}/`,
    isPageOwner: false,
  };
}
