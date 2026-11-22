import type { RelationshipDiscovery, RelationshipEntry } from '@/types/relationship';
import {
  dedupeRelationships,
  displayNameFromAnchor,
  relationshipRoot,
} from '../shared/relationships';
import type { ExtractContext } from '../types';

const RESERVED = new Set([
  'watch',
  'reels',
  'videos',
  'photos',
  'friends',
  'followers',
  'following',
  'groups',
  'marketplace',
  'gaming',
  'events',
  'settings',
  'messages',
  'notifications',
  'login',
  'search',
  'help',
  'profile.php',
  'people',
  'pages',
]);

function kindFromUrl(url: URL): RelationshipDiscovery['kind'] | null {
  const path = url.pathname.toLowerCase();
  const sk = url.searchParams.get('sk')?.toLowerCase();

  if (sk === 'followers' || /(^|\/)followers(\/|$)/.test(path)) {
    return 'followers';
  }

  if (sk === 'following' || /(^|\/)following(\/|$)/.test(path)) {
    return 'following';
  }

  return null;
}

export function discoverFacebookRelationships(
  context: ExtractContext,
): RelationshipDiscovery | null {
  const kind = kindFromUrl(context.url);
  if (!kind) {
    return null;
  }

  const entries: RelationshipEntry[] = [];
  const root = relationshipRoot(context.document);

  for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    let parsed: URL;
    try {
      parsed = new URL(anchor.getAttribute('href') ?? '', context.url.href);
    } catch {
      continue;
    }

    if (!/(^|\.)facebook\.com$/i.test(parsed.hostname)) {
      continue;
    }

    const path = parsed.pathname.toLowerCase();
    if (/(followers|following|friends)(\/|$)/.test(path)) {
      continue;
    }

    const simple = /^\/([A-Za-z0-9._-]+)\/?$/.exec(parsed.pathname);
    const id = parsed.searchParams.get('id');
    const username = simple?.[1] ?? id;

    if (!username || RESERVED.has(username.toLowerCase())) {
      continue;
    }

    const profileUrl =
      parsed.pathname.toLowerCase() === '/profile.php' && id
        ? `https://www.facebook.com/profile.php?id=${encodeURIComponent(id)}`
        : `https://www.facebook.com/${username}/`;
    const displayName = displayNameFromAnchor(anchor);

    entries.push({
      username,
      profileUrl,
      ...(displayName ? { displayName } : {}),
    });
  }

  return { kind, entries: dedupeRelationships(entries) };
}
