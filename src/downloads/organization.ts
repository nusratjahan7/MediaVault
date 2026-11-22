import type { MediaKind } from '@/types/media';
import type { PageType } from '@/types/page';
import type { PlatformId } from '@/types/platform';
import { sanitizeFilename } from '@/utils/filename';

export type MediaCategory = 'posts' | 'videos' | 'reels' | 'stories' | 'highlights';

export interface OrganizationSource {
  platform: PlatformId;
  kind: MediaKind;
  author?: string;
  pageType?: PageType;
  collectionType?: 'story' | 'highlight' | 'album';
  collectionTitle?: string;
}

export interface OrganizationSettings {
  organizeByAccount?: boolean;
  organizeByCategory?: boolean;
  splitByMediaType?: boolean;
}

export function categoryForMedia(item: OrganizationSource): MediaCategory {
  if (item.collectionType === 'highlight') {
    return 'highlights';
  }

  if (item.collectionType === 'story' || item.pageType === 'story') {
    return 'stories';
  }

  if (item.pageType === 'reel') {
    return 'reels';
  }

  if (item.kind === 'video') {
    return 'videos';
  }

  return 'posts';
}

export function buildFolderSegments(
  item: OrganizationSource,
  settings: OrganizationSettings,
): string[] {
  const segments: string[] = [item.platform];
  const account = sanitizeFilename(item.author?.trim() || '', 40);

  if (settings.organizeByAccount && item.author?.trim()) {
    segments.push(account);
  }

  const category = categoryForMedia(item);

  if (settings.organizeByCategory) {
    segments.push(category);
  }

  if (item.collectionType === 'highlight' && item.collectionTitle?.trim()) {
    if (!settings.organizeByCategory) {
      segments.push('highlights');
    }
    segments.push(sanitizeFilename(item.collectionTitle, 40));
  }

  const redundantVideoFolder = category === 'videos' || category === 'reels';
  if (settings.splitByMediaType && !redundantVideoFolder) {
    segments.push(item.kind === 'video' ? 'videos' : 'images');
  }

  return segments;
}
