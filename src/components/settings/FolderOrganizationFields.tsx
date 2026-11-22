import { useMemo } from 'react';
import { FolderTree } from 'lucide-react';
import { buildDownloadPath } from '@/downloads/filename';
import { useSettings } from '@/hooks/useSettings';
import type { MediaItem } from '@/types/media';
import { Toggle } from '../ui/Toggle';

const POST_SAMPLE: MediaItem = {
  id: 'instagram_post-sample',
  platform: 'instagram',
  kind: 'image',
  url: 'https://example.com/media/post.jpg',
  author: 'studio',
  pageType: 'post',
  downloadable: true,
};

const HIGHLIGHT_SAMPLE: MediaItem = {
  id: 'instagram_highlight-sample',
  platform: 'instagram',
  kind: 'video',
  url: 'https://example.com/media/highlight.mp4',
  author: 'studio',
  pageType: 'highlight',
  collectionType: 'highlight',
  collectionTitle: 'Travel',
  downloadable: true,
};

export function FolderOrganizationFields() {
  const { settings, updateSettings } = useSettings();

  const previews = useMemo(
    () => [
      buildDownloadPath(POST_SAMPLE, settings),
      buildDownloadPath(HIGHLIGHT_SAMPLE, settings),
    ],
    [settings],
  );

  const toggle = (key: 'organizeByAccount' | 'organizeByCategory' | 'splitByMediaType') => {
    return (checked: boolean) => {
      void updateSettings({ [key]: checked });
    };
  };

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-1.5">
        <FolderTree className="size-3.5 text-muted" aria-hidden="true" />
        <p className="text-xs font-semibold text-fg">Folder organization</p>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-fg">Folder per account</p>
          <p className="mt-0.5 max-w-[60ch] text-[11px] leading-relaxed text-muted">
            Adds the visible username or display name under the platform folder.
          </p>
        </div>
        <Toggle
          checked={settings.organizeByAccount}
          onChange={toggle('organizeByAccount')}
          label="Create a folder per account"
        />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-fg">Category subfolders</p>
          <p className="mt-0.5 max-w-[60ch] text-[11px] leading-relaxed text-muted">
            Sorts posts, videos, Reels, stories, and highlights into separate folders.
          </p>
        </div>
        <Toggle
          checked={settings.organizeByCategory}
          onChange={toggle('organizeByCategory')}
          label="Create category subfolders"
        />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-fg">Split by media type</p>
          <p className="mt-0.5 max-w-[60ch] text-[11px] leading-relaxed text-muted">
            Adds <code>images/</code> or <code>videos/</code> inside categories where the
            distinction is useful. Video-only categories are not duplicated.
          </p>
        </div>
        <Toggle
          checked={settings.splitByMediaType}
          onChange={toggle('splitByMediaType')}
          label="Split folders by media type"
        />
      </div>

      <div className="rounded-md border border-border bg-bg px-2.5 py-2">
        <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
          Path preview
        </p>
        <p className="mt-1 break-all text-[11px] text-fg">{previews[0]}</p>
        <p className="mt-0.5 break-all text-[11px] text-muted">{previews[1]}</p>
      </div>

      <p className="text-[10px] leading-relaxed text-muted">
        Chrome only accepts download paths relative to your Downloads folder. To choose a
        different destination, use <span className="font-medium text-fg">Ask where to save each
        file</span>; MediaVault does not write to arbitrary filesystem paths.
      </p>
    </div>
  );
}
