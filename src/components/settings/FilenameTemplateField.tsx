import { useMemo } from 'react';
import { FileImage } from 'lucide-react';
import { buildDownloadPath } from '@/downloads/filename';
import type { MediaItem } from '@/types/media';
import { FILENAME_TOKENS } from '@/utils/filename';
import { Input } from '../ui/Input';

export interface FilenameTemplateFieldProps {
  value: string;
  subfolder: string;
  organizeByAccount?: boolean;
  organizeByCategory?: boolean;
  splitByMediaType?: boolean;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

const SAMPLE_ITEM: MediaItem = {
  id: 'instagram_8f2c1a9d',
  platform: 'instagram',
  kind: 'video',
  url: 'https://example.com/media/sample.mp4',
  author: 'studio',
  postId: 'C8xY2aPq',
  caption: 'Studio update',
  location: 'Lisbon',
  publishedAt: Date.UTC(2026, 10, 22),
  pageType: 'reel',
  downloadable: true,
};

export function FilenameTemplateField({
  value,
  subfolder,
  organizeByAccount = false,
  organizeByCategory = true,
  splitByMediaType = false,
  onChange,
  onBlur,
}: FilenameTemplateFieldProps) {
  const preview = useMemo(() => {
    try {
      return buildDownloadPath(
        { ...SAMPLE_ITEM, index: 2 },
        {
          downloadSubfolder: subfolder,
          filenameTemplate: value,
          organizeByAccount,
          organizeByCategory,
          splitByMediaType,
        },
      );
    } catch {
      return '';
    }
  }, [
    subfolder,
    value,
    organizeByAccount,
    organizeByCategory,
    splitByMediaType,
  ]);

  const insertToken = (token: string) => {
    const separator =
      value.length > 0 && !value.endsWith('-') && !value.endsWith('_') ? '-' : '';
    onChange(`${value}${separator}${token}`);
  };

  return (
    <div className="space-y-2">
      <label htmlFor="filename-template" className="text-xs font-medium text-fg">
        Filename template
      </label>
      <Input
        id="filename-template"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder="{platform}-{username}-{id}"
        maxLength={160}
        spellCheck={false}
        invalid={value.trim().length === 0}
      />
      <div className="flex flex-wrap gap-1">
        {FILENAME_TOKENS.map((token) => (
          <button
            key={token.token}
            type="button"
            title={token.description}
            onClick={() => insertToken(token.token)}
            className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] font-medium text-muted transition-colors hover:text-fg"
          >
            {token.token}
          </button>
        ))}
      </div>
      <div className="flex items-start gap-1.5 rounded-md border border-border bg-bg px-2.5 py-2">
        <FileImage className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
        <p className="min-w-0 break-all text-[11px] leading-relaxed text-muted">
          <span className="font-medium text-fg">Preview:</span>{' '}
          {preview || 'Downloads/sample'}
        </p>
      </div>
      <p className="text-[10px] leading-relaxed text-muted">
        Unknown tokens are removed. Blank captions or locations are omitted. Long names are
        shortened automatically and Chrome adds a counter when a file already exists.
      </p>
    </div>
  );
}
