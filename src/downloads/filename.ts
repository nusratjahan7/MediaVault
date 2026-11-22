import type { MediaKind } from '@/types/media';
import type { PageType } from '@/types/page';
import type { PlatformId } from '@/types/platform';
import type { Settings } from '@/types/settings';
import {
  ensureFileExtension,
  renderFilenameTemplate,
  sanitizeSubfolder,
} from '@/utils/filename';
import { extensionFromUrl } from '@/utils/url';
import { buildFolderSegments } from './organization';

export interface DownloadPathSource {
  id: string;
  platform: PlatformId;
  kind: MediaKind;
  url: string;
  author?: string;
  pageType?: PageType;
  postId?: string;
  caption?: string;
  location?: string;
  index?: number;
  publishedAt?: number;
  collectionType?: 'story' | 'highlight' | 'album';
  collectionTitle?: string;
  outputExtension?: string;
  sidecar?: 'thumbnail' | 'caption' | 'metadata';
}

export type DownloadPathSettings = Pick<
  Settings,
  'downloadSubfolder' | 'filenameTemplate'
> &
  Partial<
    Pick<
      Settings,
      | 'organizeByAccount'
      | 'organizeByCategory'
      | 'splitByMediaType'
    >
  >;

export function inferExtension(item: DownloadPathSource): string {
  if (item.outputExtension) {
    return item.outputExtension.replace(/^\./, '').toLowerCase();
  }

  const fromUrl = extensionFromUrl(item.url);
  if (fromUrl) {
    return fromUrl;
  }

  return item.kind === 'video' ? 'mp4' : 'jpg';
}

export function buildDownloadPath(
  item: DownloadPathSource,
  settings: DownloadPathSettings,
): string {
  const extension = inferExtension(item);
  const subfolder = sanitizeSubfolder(settings.downloadSubfolder);
  const template = settings.filenameTemplate.trim() || '{platform}-{author}-{id}';
  const shortId = item.id.startsWith(`${item.platform}_`)
    ? item.id.slice(item.platform.length + 1)
    : item.id;

  const rendered = renderFilenameTemplate(template, {
    platform: item.platform,
    author: item.author,
    mediaId: item.postId,
    index: item.index,
    caption: item.caption,
    location: item.location,
    id: shortId,
    kind: item.kind,
    mediaType: item.kind,
    ext: extension,
    date: new Date(item.publishedAt ?? Date.now()),
  });

  const folders = buildFolderSegments(item, {
    organizeByAccount: settings.organizeByAccount,
    organizeByCategory: settings.organizeByCategory,
    splitByMediaType: settings.splitByMediaType,
  });

  return `${subfolder}/${folders.join('/')}/${ensureFileExtension(rendered, extension)}`;
}
