import { useState } from 'react';
import { Check, Image as ImageIcon, Lock, Play } from 'lucide-react';
import type { MediaItem } from '@/types/media';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/format';
import { sourceFormatLabel } from '@/utils/format-label';
import { Badge } from '../ui/Badge';

export interface MediaCardProps {
  item: MediaItem;
  selected: boolean;
  onToggle: () => void;
  selectionMode?: boolean;
}

export function MediaCard({
  item,
  selected,
  onToggle,
  selectionMode = true,
}: MediaCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.thumbnailUrl) && !imageFailed;
  const duration = formatDuration(item.durationSeconds);
  const dimensions =
    item.width && item.height ? `${item.width}×${item.height}` : undefined;
  const formatLabel = sourceFormatLabel(item.formats?.[0]);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!item.downloadable || !selectionMode}
      aria-pressed={item.downloadable && selectionMode ? selected : undefined}
      aria-label={
        !item.downloadable
          ? item.unsupportedReason ?? 'This media cannot be downloaded'
          : selectionMode
            ? `${selected ? 'Deselect' : 'Select'} ${item.kind}${
                item.author ? ` by ${item.author}` : ''
              }`
            : `${item.kind} preview${item.author ? ` by ${item.author}` : ''}`
      }
      className={cn(
        'group relative overflow-hidden rounded-md border bg-surface text-left transition duration-150 focus-visible:outline-none',
        selected
          ? 'border-accent ring-1 ring-accent/40'
          : 'border-border hover:border-muted/40',
        !item.downloadable && 'cursor-not-allowed',
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-elevated">
        {showImage ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className={cn(
              'h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]',
              !item.downloadable && 'opacity-40 saturate-0',
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            {item.kind === 'video' ? (
              <Play className="size-6" aria-hidden="true" />
            ) : (
              <ImageIcon className="size-6" aria-hidden="true" />
            )}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge tone="neutral" className="bg-black/45 text-white backdrop-blur-sm">
            {item.kind === 'video' ? (
              <Play className="size-2.5" aria-hidden="true" />
            ) : (
              <ImageIcon className="size-2.5" aria-hidden="true" />
            )}
            {item.kind}
          </Badge>
          {duration && (
            <Badge tone="neutral" className="bg-black/45 text-white backdrop-blur-sm">
              {duration}
            </Badge>
          )}
        </div>

        {item.downloadable && selectionMode && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-2 right-2 flex size-5 items-center justify-center rounded-md border backdrop-blur-sm transition',
              selected
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-white/70 bg-black/25 text-transparent',
            )}
          >
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}

        {dimensions && item.downloadable && (
          <span className="absolute bottom-2 left-2 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
            {dimensions}
          </span>
        )}

        {!item.downloadable && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/35 p-3 text-center text-white">
            <Lock className="size-4" aria-hidden="true" />
            <span className="text-[10px] leading-tight font-medium">
              {item.unsupportedReason ?? 'No direct file link'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <span className="truncate text-xs font-medium text-fg">
          {item.author ? `@${item.author.replace(/^@/, '')}` : item.filenameHint ?? item.kind}
        </span>
        <span
          className="shrink-0 text-[10px] tracking-wide text-muted uppercase"
          title={formatLabel ?? item.kind}
        >
          {formatLabel ?? item.kind}
        </span>
      </div>
    </button>
  );
}
