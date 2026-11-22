import { useState } from 'react';
import {
  FolderOpen,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import type { HistoryEntry } from '@/types/history';
import { cn } from '@/utils/cn';
import { formatBytes, formatRelativeTime } from '@/utils/format';
import { STATUS_META } from '@/utils/status';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';
import { PlatformBadge } from '../media/PlatformBadge';

export interface HistoryRowProps {
  entry: HistoryEntry;
  onReveal: (entry: HistoryEntry) => void;
  onRetry: (entry: HistoryEntry) => void;
  onCancel: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
}

export function HistoryRow({
  entry,
  onReveal,
  onRetry,
  onCancel,
  onDelete,
}: HistoryRowProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const meta =
    entry.paused && entry.status === 'downloading'
      ? { label: 'Paused', tone: 'warning' as const, active: true }
      : STATUS_META[entry.status];
  const thumbnail = entry.item.thumbnailUrl;
  const canReveal = entry.status === 'completed' && entry.downloadId !== undefined;
  const canCancel =
    entry.status === 'queued' || entry.status === 'downloading';
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
            {canCancel && (
              <IconButton
                label="Cancel download"
                size="sm"
                onClick={() => onCancel(entry)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </IconButton>
            )}
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
          <Badge tone={meta.tone}>{meta.label}</Badge>
          <PlatformBadge platform={entry.item.platform} />
          {entry.output && (
            <Badge tone="neutral" title={entry.output.note}>
              {entry.output.label}
            </Badge>
          )}
          <span className="text-[10px] text-muted">
            {formatRelativeTime(entry.createdAt)}
          </span>
          {entry.bytesReceived ? (
            <span className="text-[10px] text-muted">
              {entry.totalBytes
                ? `${formatBytes(entry.bytesReceived)} / ${formatBytes(entry.totalBytes)}`
                : formatBytes(entry.bytesReceived)}
            </span>
          ) : null}
        </div>

        {entry.error && (
          <p className={cn('mt-1 text-[10px] leading-relaxed text-danger')}>{entry.error}</p>
        )}
        {entry.output?.note && !entry.error && (
          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted">
            {entry.output.note}
          </p>
        )}
      </div>
    </div>
  );
}
