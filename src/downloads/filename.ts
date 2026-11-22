import type { MediaKind } from '@/types/media';
import type { PlatformId } from '@/types/platform';
import type { Settings } from '@/types/settings';
import {
  ensureFileExtension,
  renderFilenameTemplate,
  sanitizeSubfolder,
} from '@/utils/filename';
import { extensionFromUrl } from '@/utils/url';

export interface DownloadPathSource {
  id: string;
  platform: PlatformId;
  kind: MediaKind;
  url: string;
  author?: string;
  collectionType?: 'story' | 'highlight' | 'album';
  collectionTitle?: string;
}

export function inferExtension(item: DownloadPathSource): string {
  const fromUrl = extensionFromUrl(item.url);
  if (fromUrl) {
    return fromUrl;
  }

  return item.kind === 'video' ? 'mp4' : 'jpg';
}

export function buildDownloadPath(
  item: DownloadPathSource,
  settings: Pick<Settings, 'downloadSubfolder' | 'filenameTemplate'>,
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
    id: shortId,
    kind: item.kind,
    ext: extension,
    date: new Date(),
  });

  const collection =
    item.collectionType === 'highlight' && item.collectionTitle
      ? `highlights/${sanitizeSubfolder(item.collectionTitle)}/`
      : '';

  return `${subfolder}/${item.platform}/${collection}${ensureFileExtension(rendered, extension)}`;
}
