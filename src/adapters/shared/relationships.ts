import type { RelationshipEntry } from '@/types/relationship';

export const MAX_RELATIONSHIP_ROWS = 500;

export function relationshipRoot(document: Document): ParentNode {
  return (
    document.querySelector<HTMLElement>('[role="dialog"]') ??
    document.querySelector<HTMLElement>('main') ??
    document.body
  );
}

export function displayNameFromAnchor(anchor: HTMLAnchorElement): string | undefined {
  const imageAlt = anchor.querySelector<HTMLImageElement>('img')?.alt?.trim();
  if (imageAlt && !/profile picture|avatar|photo/i.test(imageAlt) && imageAlt.length <= 80) {
    return imageAlt;
  }

  const text = anchor.textContent?.replace(/\s+/g, ' ').trim();
  if (
    text &&
    text.length <= 80 &&
    !/^(follow|following|remove|verified)$/i.test(text)
  ) {
    return text;
  }

  return undefined;
}

export function dedupeRelationships(entries: RelationshipEntry[]): RelationshipEntry[] {
  const seen = new Set<string>();
  const result: RelationshipEntry[] = [];

  for (const entry of entries) {
    const key = (entry.profileUrl ?? entry.username).toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(entry);
    if (result.length >= MAX_RELATIONSHIP_ROWS) {
      break;
    }
  }

  return result;
}
