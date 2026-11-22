import { useMemo } from 'react';
import { FileImage } from 'lucide-react';
import { buildDownloadPath } from '@/downloads/filename';
import type { MediaItem } from '@/types/media';
import { Input } from '../ui/Input';

export interface FilenameTemplateFieldProps {
  value: string;
  subfolder: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

const TOKENS = ['{platform}', '{author}', '{id}', '{date}', '{kind}', '{ext}'] as const;

const SAMPLE_ITEM: MediaItem = {
  id: 'instagram_8f2c1a9d',
  platform: 'instagram',
  kind: 'video',
  url: 'https://example.com/media/sample.mp4',
  author: 'studio',
  downloadable: true,
};

export function FilenameTemplateField({
  value,
  subfolder,
  onChange,
  onBlur,
}: FilenameTemplateFieldProps) {
  const preview = useMemo(() => {
    try {
      return buildDownloadPath(SAMPLE_ITEM, {
        downloadSubfolder: subfolder,
        filenameTemplate: value,
      });
    } catch {
      return '';
    }
  }, [subfolder, value]);

  const insertToken = (token: string) => {
    const separator = value.length > 0 && !value.endsWith('-') && !value.endsWith('_') ? '-' : '';
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
        placeholder="{platform}-{author}-{id}"
        spellCheck={false}
        invalid={value.trim().length === 0}
      />
      <div className="flex flex-wrap gap-1">
        {TOKENS.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => insertToken(token)}
            className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] font-medium text-muted transition-colors hover:text-fg"
          >
            {token}
          </button>
        ))}
      </div>
      <div className="flex items-start gap-1.5 rounded-md border border-border bg-bg px-2.5 py-2">
        <FileImage className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
        <p className="min-w-0 break-all text-[11px] leading-relaxed text-muted">
          <span className="font-medium text-fg">Preview:</span> {preview || 'Downloads/sample'}
        </p>
      </div>
    </div>
  );
}
