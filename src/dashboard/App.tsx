import { useMemo, useState } from 'react';
import {
  Archive,
  Ban,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Download,
  FolderOpen,
  HardDrive,
  Moon,
  RefreshCw,
  RotateCcw,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { openDownload, showDownload } from '@/downloads/client';
import { useDashboard } from '@/hooks/useDashboard';
import { useDemoHistory } from '@/hooks/useDemoHistory';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { sendToBackground } from '@/services/messaging';
import type { DashboardSnapshot } from '@/types/dashboard';
import type { DownloadStatus, HistoryEntry } from '@/types/history';
import { cn } from '@/utils/cn';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';
import { formatBytes, formatRelativeTime, pluralize } from '@/utils/format';
import { STATUS_META } from '@/utils/status';

type DashboardFilter = 'all' | 'active' | 'completed' | 'failed' | 'cancelled';

const FILTERS: Array<{ id: DashboardFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Queue' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'cancelled', label: 'Cancelled' },
];

function snapshotFromEntries(entries: HistoryEntry[]): DashboardSnapshot {
  const counts: DashboardSnapshot['counts'] = {
    queued: 0,
    downloading: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    interrupted: 0,
  };
  let completedBytes = 0;
  let completedWithBytes = 0;

  for (const entry of entries) {
    counts[entry.status] += 1;
    if (entry.status === 'completed') {
      const bytes = entry.totalBytes ?? entry.bytesReceived;
      if (bytes && bytes > 0) {
        completedBytes += bytes;
        completedWithBytes += 1;
      }
    }
  }

  return {
    entries: [...entries].sort((a, b) => b.updatedAt - a.updatedAt),
    counts,
    completedFiles: counts.completed,
    completedBytes,
    completedWithBytes,
  };
}

function statusMatches(filter: DashboardFilter, status: DownloadStatus): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'active':
      return status === 'queued' || status === 'downloading';
    case 'failed':
      return status === 'failed' || status === 'interrupted';
    case 'completed':
      return status === 'completed';
    case 'cancelled':
      return status === 'cancelled';
  }
}

function entryProgress(entry: HistoryEntry): number | undefined {
  if (entry.status === 'completed') {
    return 100;
  }

  if (
    entry.status === 'downloading' &&
    entry.totalBytes &&
    entry.totalBytes > 0 &&
    entry.bytesReceived !== undefined
  ) {
    return Math.min(99, Math.round((entry.bytesReceived / entry.totalBytes) * 100));
  }

  return undefined;
}

function basename(filename: string): string {
  return filename.split('/').pop() ?? filename;
}

interface TileProps {
  entry: HistoryEntry;
  demo: boolean;
  onOpen: (entry: HistoryEntry) => void;
  onRetry: (entry: HistoryEntry) => void;
  onCancel: (entry: HistoryEntry) => void;
}

function DashboardTile({ entry, demo, onOpen, onRetry, onCancel }: TileProps) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const progress = entryProgress(entry);
  const canOpen = entry.status === 'completed';
  const canRetry =
    entry.status === 'failed' ||
    entry.status === 'interrupted' ||
    entry.status === 'cancelled';
  const canCancel = entry.status === 'queued' || entry.status === 'downloading';
  const totalBytes =
    entry.totalBytes && entry.totalBytes > 0 ? entry.totalBytes : undefined;
  const meta = STATUS_META[entry.status];

  const open = () => {
    if (canOpen) {
      onOpen(entry);
    }
  };

  return (
    <Card
      className={cn(
        'group overflow-hidden transition',
        canOpen && 'cursor-pointer hover:border-accent/40 hover:shadow-md',
      )}
      onClick={open}
      onKeyDown={(event) => {
        if (canOpen && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          open();
        }
      }}
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      title={canOpen ? 'Open the downloaded file' : undefined}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-elevated">
        {entry.item.thumbnailUrl && !thumbnailFailed ? (
          <img
            src={entry.item.thumbnailUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setThumbnailFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <Download className="size-6" aria-hidden="true" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge tone={meta.tone} className="bg-black/45 text-white backdrop-blur-sm">
            {meta.label}
          </Badge>
          {entry.paused && entry.status === 'downloading' && (
            <Badge tone="warning" className="bg-black/45 text-white backdrop-blur-sm">
              Paused
            </Badge>
          )}
        </div>
        {canOpen && (
          <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-md bg-black/45 text-white/90 opacity-0 transition-opacity group-hover:opacity-100">
            <FolderOpen className="size-3.5" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-fg" title={entry.filename}>
              {basename(entry.filename)}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-muted">
              {entry.item.author ? `@${entry.item.author.replace(/^@/, '')}` : 'Unknown account'}
              {' · '}
              {entry.item.platform}
            </p>
          </div>
          <span className="shrink-0 text-[10px] text-muted">
            {formatRelativeTime(entry.updatedAt)}
          </span>
        </div>

        {entry.status === 'downloading' && (
          <div className="mt-2">
            {progress !== undefined ? (
              <ProgressBar value={progress} />
            ) : (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div className="mv-indeterminate h-full w-1/3 rounded-full bg-accent" />
              </div>
            )}
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
              <span>{progress !== undefined ? `${progress}%` : 'In progress'}</span>
              <span>
                {entry.bytesReceived !== undefined ? formatBytes(entry.bytesReceived) : '—'}
                {totalBytes ? ` / ${formatBytes(totalBytes)}` : ' · size unavailable'}
              </span>
            </div>
          </div>
        )}

        {entry.status !== 'downloading' && (
          <p className="mt-1.5 text-[10px] text-muted">
            {totalBytes
              ? formatBytes(totalBytes)
              : entry.bytesReceived
                ? `${formatBytes(entry.bytesReceived)} received`
                : 'Size unavailable'}
          </p>
        )}

        {entry.error && (
          <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-danger">
            {entry.error}
          </p>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {canOpen && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(entry);
              }}
              icon={<FolderOpen className="size-3.5" aria-hidden="true" />}
            >
              Open file
            </Button>
          )}
          {canRetry && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(event) => {
                event.stopPropagation();
                onRetry(entry);
              }}
              icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
            >
              Retry
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onCancel(entry);
              }}
              icon={<X className="size-3.5" aria-hidden="true" />}
            >
              Cancel
            </Button>
          )}
          {demo && (canOpen || canRetry || canCancel) && (
            <span className="self-center text-[9px] text-muted">Preview</span>
          )}
        </div>
      </div>
    </Card>
  );
}

export function App() {
  const { settings } = useSettings();
  const demo = settings.demoMode;
  const { resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const demoHistory = useDemoHistory();
  const live = useDashboard(!demo);
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const snapshot = useMemo(
    () => (demo ? snapshotFromEntries(demoHistory.entries) : live.snapshot),
    [demo, demoHistory.entries, live.snapshot],
  );
  const loading = demo ? false : live.loading;
  const error = demo ? null : live.error;

  const remaining = snapshot.counts.queued + snapshot.counts.downloading;
  const attention = snapshot.counts.failed + snapshot.counts.interrupted;

  const filtered = useMemo(() => {
    const entries = snapshot.entries.filter((entry) =>
      statusMatches(filter, entry.status),
    );
    return ['active', 'all'].includes(filter)
      ? [...entries].sort((a, b) => a.createdAt - b.createdAt)
      : entries;
  }, [snapshot.entries, filter]);

  const handleOpen = async (entry: HistoryEntry) => {
    if (demo) {
      toast({
        title: 'Preview only',
        description: 'Sample downloads are not connected to files on disk.',
      });
      return;
    }

    if (entry.downloadId === undefined) {
      toast({
        title: 'File unavailable',
        description: 'Chrome no longer has a record of this download.',
        variant: 'error',
      });
      return;
    }

    if (!(await openDownload(entry.downloadId))) {
      if (await showDownload(entry.downloadId)) {
        toast({
          title: 'Opened the download folder',
          description: 'Chrome could not open the file directly, so its folder was shown.',
        });
        return;
      }

      toast({
        title: 'Could not open file',
        description: 'The file may have been moved, deleted, or opened without a user action.',
        variant: 'error',
      });
    }
  };

  const handleRetry = async (entry: HistoryEntry) => {
    if (demo) {
      toast({ title: 'Preview: retry queued', description: 'No real download started.' });
      return;
    }

    try {
      const response = await sendToBackground({
        type: 'RETRY_DOWNLOAD',
        historyId: entry.id,
      });
      if (!response.ok) {
        throw fromErrorPayload(response.error);
      }
      toast({
        title: response.data.retried ? 'Download retried' : 'Could not retry',
        description: response.data.retried
          ? 'A fresh browser download was queued.'
          : 'The link may have expired. Rescan the page for a fresh URL.',
        variant: response.data.retried ? 'success' : 'error',
      });
      await live.refresh();
    } catch (caught) {
      toast({
        title: 'Could not retry',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    }
  };

  const handleCancel = async (entry: HistoryEntry) => {
    if (demo) {
      toast({ title: 'Preview: cancel', description: 'No real download was cancelled.' });
      return;
    }

    try {
      const response = await sendToBackground({
        type: 'CANCEL_DOWNLOAD',
        historyId: entry.id,
      });
      if (!response.ok) {
        throw fromErrorPayload(response.error);
      }
      toast({
        title: response.data.cancelled ? 'Cancelling download' : 'Download already finished',
        description: response.data.cancelled
          ? 'Chrome will confirm the cancellation.'
          : 'The file completed before the request arrived.',
        variant: response.data.cancelled ? 'success' : 'default',
      });
      await live.refresh();
    } catch (caught) {
      toast({
        title: 'Could not cancel',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    }
  };

  const clearCompleted = async () => {
    if (demo) {
      toast({ title: 'Preview only', description: 'Demo history is not cleared here.' });
      return;
    }

    setClearing(true);
    try {
      const cleared = await live.clearCompleted();
      toast({
        title: 'Completed entries cleared',
        description: `${cleared} ${pluralize(cleared, 'entry', 'entries')} removed. Files stay on disk.`,
        variant: 'success',
      });
      setConfirmClear(false);
    } catch (caught) {
      toast({
        title: 'Could not clear completed entries',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      setClearing(false);
    }
  };

  const counts = snapshot.counts;

  return (
    <PageShell
      active="dashboard"
      title="Download dashboard"
      description="Monitor active and finished downloads with Chrome-reported progress. Sizes are shown only when Chrome provides them."
      actions={
        <>
          {demo && <Badge tone="accent">Demo data</Badge>}
          <IconButton
            label="Refresh dashboard"
            onClick={() => {
              if (demo) {
                toast({ title: 'Preview refreshed' });
              } else {
                void live.refresh();
              }
            }}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={() => {
              void setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
            }}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="size-4" aria-hidden="true" />
            ) : (
              <Moon className="size-4" aria-hidden="true" />
            )}
          </IconButton>
        </>
      }
    >
      {demo && <DemoBanner />}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Active"
          value={counts.downloading}
          hint="downloading now"
          tone="accent"
          icon={<Download className="size-4" />}
        />
        <StatCard
          label="Remaining"
          value={remaining}
          hint="queued + active"
          tone="warning"
          icon={<Clock3 className="size-4" />}
        />
        <StatCard
          label="Completed"
          value={snapshot.completedFiles}
          hint="files in history"
          tone="success"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatCard
          label="Failed"
          value={attention}
          hint="failed or interrupted"
          tone="danger"
          icon={<CircleAlert className="size-4" />}
        />
        <StatCard
          label="Cancelled"
          value={counts.cancelled}
          hint="cancelled downloads"
          tone="default"
          icon={<Ban className="size-4" />}
        />
        <StatCard
          label="Known size"
          value={
            snapshot.completedWithBytes > 0
              ? formatBytes(snapshot.completedBytes)
              : 'Unknown'
          }
          hint={
            snapshot.completedWithBytes > 0
              ? `${snapshot.completedWithBytes}/${snapshot.completedFiles} completed with size`
              : 'Chrome provided no total sizes'
          }
          tone="default"
          icon={<HardDrive className="size-4" />}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((item) => {
            const count =
              item.id === 'active'
                ? remaining
                : item.id === 'failed'
                  ? attention
                  : item.id === 'all'
                    ? snapshot.entries.length
                    : item.id === 'completed'
                      ? counts.completed
                      : counts.cancelled;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
                  filter === item.id
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-border bg-surface text-muted hover:text-fg',
                )}
              >
                {item.label} ({count})
              </button>
            );
          })}
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={counts.completed === 0}
          onClick={() => setConfirmClear(true)}
          icon={<Trash2 className="size-3.5" aria-hidden="true" />}
        >
          Clear completed ({counts.completed})
        </Button>
      </div>

      {error ? (
        <Card className="p-4">
          <p className="text-xs text-danger">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            onClick={() => void live.refresh()}
          >
            Try again
          </Button>
        </Card>
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-56 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Archive className="size-5" aria-hidden="true" />}
          title={filter === 'active' ? 'Queue is empty' : 'Nothing in this view'}
          description={
            filter === 'active'
              ? 'Start a download from the popup or an in-page button to see it here.'
              : 'Completed, failed, and cancelled downloads will appear here.'
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((entry) => (
            <DashboardTile
              key={entry.id}
              entry={entry}
              demo={demo}
              onOpen={(target) => void handleOpen(target)}
              onRetry={(target) => void handleRetry(target)}
              onCancel={(target) => void handleCancel(target)}
            />
          ))}
        </div>
      )}

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear completed dashboard entries?"
        description="This removes completed entries from local history. Downloaded files stay on disk."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={clearing}
              onClick={() => void clearCompleted()}
            >
              Clear completed
            </Button>
          </>
        }
      />
    </PageShell>
  );
}
