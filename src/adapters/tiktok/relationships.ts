import type { RelationshipDiscovery, RelationshipEntry } from '@/types/relationship';
import {
  dedupeRelationships,
  displayNameFromAnchor,
  relationshipRoot,
} from '../shared/relationships';
import type { ExtractContext } from '../types';

export function discoverTikTokRelationships(
  context: ExtractContext,
): RelationshipDiscovery | null {
  const match = /^\/@([^/]+)\/(followers|following)\/?$/.exec(
    context.url.pathname,
  );
  if (!match?.[2]) {
    return null;
  }

  const kind = match[2] as RelationshipDiscovery['kind'];
  const entries: RelationshipEntry[] = [];
  const root = relationshipRoot(context.document);

  for (const anchor of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    let parsed: URL;
    try {
      parsed = new URL(anchor.getAttribute('href') ?? '', context.url.href);
    } catch {
      continue;
    }

    if (!/(^|\.)tiktok\.com$/i.test(parsed.hostname)) {
      continue;
    }

    const profile = /^\/@([^/]+)\/?$/.exec(parsed.pathname);
    const username = profile?.[1];
    if (!username) {
      continue;
    }

    const displayName = displayNameFromAnchor(anchor);
    entries.push({
      username: decodeURIComponent(username),
      profileUrl: `https://www.tiktok.com/@${encodeURIComponent(username)}`,
      ...(displayName ? { displayName } : {}),
    });
  }

  return { kind, entries: dedupeRelationships(entries) };
}
