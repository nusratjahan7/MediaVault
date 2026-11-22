import { Archive, Loader2 } from 'lucide-react';
import type { HistoryEntry } from '@/types/history';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';
import { HistoryRow } from './HistoryRow';

export interface HistoryListProps {
  entries: HistoryEntry[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  onRefresh: () => void;
  onLoadMore: () => void;
  onReveal: (entry: HistoryEntry) => void;
  onRetry: (entry: HistoryEntry) => void;
  onCancel: (entry: HistoryEntry) => void;
  onDelete: (entry: HistoryEntry) => void;
}

export function HistoryList({
  entries,
  loading,
  loadingMore,
  hasMore,
  error,
  onRefresh,
  onLoadMore,
  onReveal,
  onRetry,
  onCancel,
  onDelete,
}: HistoryListProps) {
  if (loading && entries.length === 0) {
    return (
      <div className="space-y-2 p-3" aria-label="Loading download history">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex gap-2.5">
            <Skeleton className="size-12 shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && entries.length === 0) {
    return <ErrorState description={error} onRetry={onRefresh} compact />;
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Archive className="size-5" aria-hidden="true" />}
        title="No downloads yet"
        description="Media you save from Instagram, Facebook, or TikTok will appear here. Everything stays on this device."
      />
    );
  }

  return (
    <div>
      <div className="divide-y divide-border">
        {entries.map((entry) => (
          <HistoryRow
            key={entry.id}
            entry={entry}
            onReveal={onReveal}
            onRetry={onRetry}
            onCancel={onCancel}
            onDelete={onDelete}
          />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center border-t border-border p-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadMore}
            loading={loadingMore}
            icon={!loadingMore ? <Loader2 className="size-3.5" aria-hidden="true" /> : undefined}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
