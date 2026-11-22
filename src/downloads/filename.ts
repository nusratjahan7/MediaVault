import type { MediaItem } from '@/types/media';
import type { Settings } from '@/types/settings';
import {
  ensureFileExtension,
  renderFilenameTemplate,
  sanitizeSubfolder,
} from '@/utils/filename';
import { extensionFromUrl } from '@/utils/url';

export function inferExtension(item: MediaItem): string {
  const fromUrl = extensionFromUrl(item.url);
  if (fromUrl) {
    return fromUrl;
  }

  return item.kind === 'video' ? 'mp4' : 'jpg';
}

export function buildDownloadPath(
  item: MediaItem,
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

  return `${subfolder}/${item.platform}/${ensureFileExtension(rendered, extension)}`;
}
