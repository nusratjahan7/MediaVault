import type { InPageActionTarget } from '@/types/in-page';
import type { MediaItem } from '@/types/media';

function normalized(value: string | undefined): string {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return value;
  }
}

function matchesMediaUrl(item: MediaItem, target: InPageActionTarget): boolean {
  const urls = new Set((target.mediaUrls ?? []).map(normalized).filter(Boolean));
  if (urls.size === 0) {
    return false;
  }

  return urls.has(normalized(item.url)) || urls.has(normalized(item.thumbnailUrl));
}

function matchesPost(item: MediaItem, target: InPageActionTarget): boolean {
  if (!target.postUrl) {
    return false;
  }

  if (item.postUrl === target.postUrl) {
    return true;
  }

  if (!item.postId) {
    return false;
  }

  try {
    return new URL(target.postUrl).pathname.includes(item.postId);
  } catch {
    return false;
  }
}

function preferKind(
  candidates: MediaItem[],
  kind: MediaItem['kind'] | undefined,
): MediaItem[] {
  if (!kind) {
    return candidates;
  }

  const matching = candidates.filter((item) => item.kind === kind);
  return matching.length > 0 ? matching : candidates;
}

function preferDownloadable(candidates: MediaItem[]): MediaItem[] {
  const downloadable = candidates.filter((item) => item.downloadable);
  return downloadable.length > 0 ? downloadable : candidates;
}

function pickOne(candidates: MediaItem[], target: InPageActionTarget): MediaItem[] {
  if (candidates.length <= 1) {
    return candidates;
  }

  const urlMatches = candidates.filter((item) => matchesMediaUrl(item, target));
  if (urlMatches.length > 0) {
    const downloadableUrlMatch = preferDownloadable(urlMatches)[0];
    if (downloadableUrlMatch) {
      return [downloadableUrlMatch];
    }
  }

  const kindMatch = preferKind(candidates, target.mediaKindHint);
  return [preferDownloadable(kindMatch)[0] ?? urlMatches[0] ?? candidates[0]!];
}

function fallbackSinglePage(items: MediaItem[], targetCount: number): MediaItem[] {
  return targetCount === 1 ? items : [];
}

export function selectItemsForTarget(
  target: InPageActionTarget,
  items: MediaItem[],
  targetCount: number,
): MediaItem[] {
  const mode = target.selectionMode ?? (target.kind === 'post' ? 'all' : 'single');

  if (target.kind === 'profile-picture') {
    const images = items.filter((item) => item.kind === 'image');
    const matching = images.filter(
      (item) =>
        matchesMediaUrl(item, target) ||
        item.filenameHint === 'instagram-profile-picture' ||
        item.caption === 'Profile picture',
    );
    return pickOne(
      matching.length > 0
        ? matching
        : fallbackSinglePage(images, targetCount),
      target,
    );
  }

  if (target.kind === 'story') {
    const matching = items.filter((item) => matchesMediaUrl(item, target));
    if (matching.length > 0) {
      return pickOne(matching, target);
    }

    const byKind = preferKind(items, target.mediaKindHint);
    if (byKind.length > 0) {
      return pickOne(byKind, target);
    }

    return pickOne(fallbackSinglePage(items, targetCount), target);
  }

  const postMatches = items.filter((item) => matchesPost(item, target));
  const mediaMatches = items.filter((item) => matchesMediaUrl(item, target));
  const candidates =
    postMatches.length > 0
      ? [...postMatches, ...mediaMatches.filter((item) => !postMatches.includes(item))]
      : mediaMatches.length > 0
        ? mediaMatches
        : fallbackSinglePage(items, targetCount);

  if (candidates.length === 0) {
    return [];
  }

  if (mode === 'all') {
    return candidates;
  }

  const preferredVideo =
    mode === 'prefer-video'
      ? candidates.filter((item) => item.kind === 'video' && item.downloadable)
      : [];

  if (preferredVideo.length > 0) {
    return [preferredVideo[0]!];
  }

  return pickOne(candidates, target);
}

export function findTargetForPost(
  targets: InPageActionTarget[],
  postUrl: string | undefined,
): InPageActionTarget | undefined {
  return postUrl
    ? targets.find((target) => target.postUrl === postUrl)
    : undefined;
}
