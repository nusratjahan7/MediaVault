import { useState } from 'react';
import {
  FolderOpen,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  Video,
} from 'lucide-react';
import type { DownloadStatus, HistoryEntry } from '@/types/history';
import { cn } from '@/utils/cn';
import { formatBytes, formatRelativeTime } from '@/utils/format';
import { Badge, type BadgeTone } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { PlatformBadge } from '../media/PlatformBadge';

const STATUS_TONES: Record<DownloadStatus, BadgeTone> = {
  completed: 'success',
  downloading: 'accent',
  queued: 'neutral',
  failed: 'danger',
  interrupted: 'warning',
  cancelled: 'neutral',
};

const STATUS_LABELS: Record<DownloadStatus, string> = {
  completed: 'Saved',
  downloading: 'Downloading',
  queued: 'Queued',
  failed: 'Failed',
  interrupted: 'Interrupted',
  cancelled: 'Cancelled',
};

export interface HistoryRowProps {
  entry: HistoryEntry;
  onReveal: (entry: HistoryEntry) => void;
  onRetry: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
}

export function HistoryRow({ entry, onReveal, onRetry, onDelete }: HistoryRowProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const thumbnail = entry.item.thumbnailUrl;
  const canReveal = entry.status === 'completed' && entry.downloadId !== undefined;
  const canRetry =
    entry.status === 'failed' ||
    entry.status === 'interrupted' ||
    entry.status === 'cancelled';

  return (
    <div className="flex gap-2.5 border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-elevated">
        {thumbnail && !thumbnailFailed ? (
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setThumbnailFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            {entry.item.kind === 'video' ? (
              <Video className="size-4" aria-hidden="true" />
            ) : (
              <ImageIcon className="size-4" aria-hidden="true" />
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className="truncate text-xs font-medium text-fg"
            title={entry.filename}
          >
            {entry.filename.split('/').pop() ?? entry.filename}
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            {canReveal && (
              <IconButton
                label="Show in folder"
                size="sm"
                onClick={() => onReveal(entry)}
              >
                <FolderOpen className="size-3.5" aria-hidden="true" />
              </IconButton>
            )}
            {canRetry && (
              <IconButton label="Download again" size="sm" onClick={() => onRetry(entry)}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
              </IconButton>
            )}
            <IconButton label="Remove from history" size="sm" onClick={() => onDelete(entry)}>
              <Trash2 className="size-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Badge tone={STATUS_TONES[entry.status]}>{STATUS_LABELS[entry.status]}</Badge>
          <PlatformBadge platform={entry.item.platform} />
          <span className="text-[10px] text-muted">
            {formatRelativeTime(entry.createdAt)}
          </span>
          {entry.bytesReceived ? (
            <span className="text-[10px] text-muted">{formatBytes(entry.bytesReceived)}</span>
          ) : null}
        </div>

        {entry.error && (
          <p className={cn('mt-1 text-[10px] leading-relaxed text-danger')}>{entry.error}</p>
        )}
      </div>
    </div>
  );
}
