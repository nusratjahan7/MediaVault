import type { AccountIdentity } from '@/types/page';
import { ogContent } from '../shared/dom';
import { parseTikTokEmbeddedState } from './parse-embedded-state';

export function identifyTikTokAccount(document: Document): AccountIdentity | null {
  const embedded = parseTikTokEmbeddedState(document);

  if (embedded?.author) {
    return {
      platform: 'tiktok',
      username: embedded.author,
      displayName: embedded.authorName ?? embedded.author,
      profileUrl: `https://www.tiktok.com/@${embedded.author}`,
      isPageOwner: false,
    };
  }

  const ogTitle = ogContent(document, 'og:title');
  let username =
    ogTitle?.match(/\(@([A-Za-z0-9._]+)\)/)?.[1] ??
    ogTitle?.match(/@([A-Za-z0-9._]+)/)?.[1];

  if (!username) {
    const href = document
      .querySelector<HTMLAnchorElement>('a[href^="/@"]')
      ?.getAttribute('href');
    const match = href?.match(/^\/@([^/?#]+)/);
    username = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  }

  if (!username) {
    return null;
  }

  return {
    platform: 'tiktok',
    username,
    displayName: ogTitle?.replace(/\s*\(@[^)]*\).*$/u, '').trim() || username,
    profileUrl: `https://www.tiktok.com/@${username}`,
    isPageOwner: false,
  };
}
