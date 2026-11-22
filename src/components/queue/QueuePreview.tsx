import {
  Image as ImageIcon,
  ListVideo,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import type { QueuePreviewController, QueuePreviewItem } from '@/types/ui';
import { cn } from '@/utils/cn';
import { STATUS_META } from '@/utils/status';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { IconButton } from '../ui/IconButton';
import { ProgressBar } from '../ui/ProgressBar';
import { Skeleton } from '../ui/Skeleton';

export interface QueuePreviewProps {
  controller: QueuePreviewController;
  limit?: number;
  onViewAll?: () => void;
  onPause?: (item: QueuePreviewItem) => void;
  onResume?: (item: QueuePreviewItem) => void;
  onCancel?: (item: QueuePreviewItem) => void;
  onRetry?: (item: QueuePreviewItem) => void;
  className?: string;
}

function itemBasename(filename: string): string {
  return filename.split('/').pop() ?? filename;
}

interface QueueRowProps {
  item: QueuePreviewItem;
  onPause?: (item: QueuePreviewItem) => void;
  onResume?: (item: QueuePreviewItem) => void;
  onCancel?: (item: QueuePreviewItem) => void;
  onRetry?: (item: QueuePreviewItem) => void;
}

function QueueRow({ item, onPause, onResume, onCancel, onRetry }: QueueRowProps) {
  const meta = item.paused
    ? { label: 'Paused', tone: 'warning' as const, active: true }
    : STATUS_META[item.status];
  const active = meta.active;
  const progress = item.progress;
  const canCancel = item.status === 'queued' || item.status === 'downloading';
  const canRetry =
    item.status === 'failed' ||
    item.status === 'interrupted' ||
    item.status === 'cancelled';
  const hasActions =
    (item.status === 'downloading' && Boolean(onPause || onResume)) ||
    (canCancel && Boolean(onCancel)) ||
    (canRetry && Boolean(onRetry));

  return (
    <div className="px-3 py-2">
      <div className="flex items-start gap-2">
        <div className="relative size-8 shrink-0 overflow-hidden rounded-md border border-border bg-elevated">
          {item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : item.kind === 'video' ? (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <Play className="size-3" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              <ImageIcon className="size-3" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[11px] font-medium text-fg" title={item.filename}>
              {itemBasename(item.filename)}
            </p>
            <Badge tone={meta.tone} className="shrink-0">
              {meta.label}
            </Badge>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted">
            <span className="capitalize">{item.platform}</span>
            {item.sizeLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>{item.sizeLabel}</span>
              </>
            )}
          </div>

          {active && (
            <div className="mt-1.5">
              {progress !== undefined ? (
                <ProgressBar value={progress} />
              ) : (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div className="mv-indeterminate h-full w-1/3 rounded-full bg-accent" />
                </div>
              )}
            </div>
          )}

          {hasActions && (
            <div className="mt-1 flex items-center gap-0.5">
              {item.status === 'downloading' &&
                (item.paused ? (
                  onResume && (
                    <IconButton
                      label="Resume download"
                      size="sm"
                      onClick={() => onResume(item)}
                    >
                      <Play className="size-3" aria-hidden="true" />
                    </IconButton>
                  )
                ) : (
                  onPause && (
                    <IconButton
                      label="Pause download"
                      size="sm"
                      onClick={() => onPause(item)}
                    >
                      <Pause className="size-3" aria-hidden="true" />
                    </IconButton>
                  )
                ))}
              {canCancel && onCancel && (
                <IconButton
                  label="Cancel download"
                  size="sm"
                  onClick={() => onCancel(item)}
                >
                  <X className="size-3" aria-hidden="true" />
                </IconButton>
              )}
              {canRetry && onRetry && (
                <IconButton
                  label="Retry download"
                  size="sm"
                  onClick={() => onRetry(item)}
                >
                  <RotateCcw className="size-3" aria-hidden="true" />
                </IconButton>
              )}
            </div>
          )}

          {item.error && (
            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-danger">
              {item.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function QueuePreview({
  controller,
  limit = 3,
  onViewAll,
  onPause,
  onResume,
  onCancel,
  onRetry,
  className,
}: QueuePreviewProps) {
  const activeCount = controller.items.filter(
    (item) => STATUS_META[item.status].active,
  ).length;
  const failedCount = controller.items.filter(
    (item) => item.status === 'failed' || item.status === 'interrupted',
  ).length;
  const visible = controller.items.slice(0, limit);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5">
          <ListVideo className="size-3.5 text-muted" aria-hidden="true" />
          <p className="text-[11px] font-semibold tracking-tight text-fg">Download queue</p>
          {activeCount > 0 && <Badge tone="accent">{activeCount} active</Badge>}
          {failedCount > 0 && (
            <Badge tone="danger">
              {failedCount} {failedCount === 1 ? 'failure' : 'failures'}
            </Badge>
          )}
        </div>
        {controller.mode === 'demo' && <Badge tone="accent">Demo</Badge>}
      </div>

      {controller.loading && controller.items.length === 0 ? (
        <div className="space-y-2 p-3">
          {[0, 1].map((row) => (
            <div key={row} className="flex items-center gap-2">
              <Skeleton className="size-8 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-2.5 w-3/4" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : controller.error ? (
        <div className="flex items-center justify-between gap-2 px-3 py-3 text-[11px] text-danger">
          <span>Queue unavailable.</span>
          <button
            type="button"
            onClick={() => {
              void controller.refresh();
            }}
            className="font-medium text-accent hover:opacity-80"
          >
            Retry
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <p className="text-[11px] font-medium text-fg">Queue is clear</p>
          <p className="mt-0.5 text-[10px] text-muted">
            Selected media will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              onPause={onPause}
              onResume={onResume}
              onCancel={onCancel}
              onRetry={onRetry}
            />
          ))}
        </div>
      )}

      {onViewAll && controller.items.length > 0 && (
        <div className="border-t border-border px-3 py-2">
          <button
            type="button"
            onClick={onViewAll}
            className="text-[10px] font-medium text-accent transition-opacity hover:opacity-80"
          >
            View all downloads
          </button>
        </div>
      )}
    </Card>
  );
}
