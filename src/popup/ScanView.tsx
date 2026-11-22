import { useMemo } from 'react';
import { Image as ImageIcon, RefreshCw, ScanSearch } from 'lucide-react';
import type { DownloadController } from '@/hooks/useDownloads';
import type { ScanController } from '@/hooks/useScan';
import type { SelectionController } from '@/hooks/useSelection';
import type { MediaFilter } from '@/components/media/MediaFilters';
import type { MediaItem } from '@/types/media';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { DownloadBar } from '@/components/media/DownloadBar';
import { LimitationNotice } from '@/components/media/LimitationNotice';
import { MediaActionBar } from '@/components/media/MediaActionBar';
import { MediaFilters } from '@/components/media/MediaFilters';
import { MediaGrid } from '@/components/media/MediaGrid';
import { SelectionBar } from '@/components/media/SelectionBar';

export interface ScanViewProps {
  scan: ScanController;
  filter: MediaFilter;
  onFilterChange: (filter: MediaFilter) => void;
  selection: SelectionController;
  downloads: DownloadController;
  selectionMode: boolean;
  onToggleSelection: () => void;
  onDownloadCurrent: () => void;
  onBulkDownload: () => void;
  onDownload: () => void;
  onOpenLibrary: () => void;
}

function filterItems(items: MediaItem[], filter: MediaFilter): MediaItem[] {
  if (filter === 'all') {
    return items;
  }

  return items.filter((item) => item.kind === filter);
}

export function ScanView({
  scan,
  filter,
  onFilterChange,
  selection,
  downloads,
  selectionMode,
  onToggleSelection,
  onDownloadCurrent,
  onBulkDownload,
  onDownload,
  onOpenLibrary,
}: ScanViewProps) {
  const items = useMemo(() => scan.result?.items ?? [], [scan.result]);
  const filtered = useMemo(() => filterItems(items, filter), [items, filter]);
  const counts = useMemo(
    () => ({
      all: items.length,
      image: items.filter((item) => item.kind === 'image').length,
      video: items.filter((item) => item.kind === 'video').length,
    }),
    [items],
  );

  if (scan.state === 'idle') {
    return (
      <div className="animate-rise p-3">
        <EmptyState
          icon={<ScanSearch className="size-5" aria-hidden="true" />}
          title="Ready to scan"
          description="Automatic scanning is off. Scan this page to look for media that is visible right now."
          action={
            <Button
              size="sm"
              onClick={() => {
                void scan.scan();
              }}
              icon={<ScanSearch className="size-3.5" aria-hidden="true" />}
            >
              Scan this page
            </Button>
          }
        />
      </div>
    );
  }

  if (scan.state === 'scanning') {
    return (
      <div className="space-y-3 p-4" aria-label="Scanning this page">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-7 w-20" />
        </div>
        <Skeleton className="h-8 w-full" />
        <div className="grid grid-cols-2 gap-2.5">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="overflow-hidden rounded-md border border-border">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="p-2">
                <Skeleton className="h-2.5 w-2/3" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] text-muted">Reading media on this page…</p>
      </div>
    );
  }

  if (scan.state === 'error') {
    return (
      <ErrorState
        title="Could not scan this page"
        description={scan.error ?? 'Reload the page and try again.'}
        onRetry={() => {
          void scan.scan();
        }}
      />
    );
  }

  const limitations = scan.result?.limitations ?? [];

  if (items.length === 0) {
    return (
      <div className="animate-rise space-y-3 p-3">
        <LimitationNotice limitations={limitations} />
        <EmptyState
          icon={<ScanSearch className="size-5" aria-hidden="true" />}
          title="No downloadable media found"
          description="Open a post or video, or scroll to load more content, then scan again. Private and restricted content is not accessible by design."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void scan.scan();
              }}
              icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
            >
              Scan again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="space-y-3 p-3 pb-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-fg">
              {items.length} {items.length === 1 ? 'item' : 'items'} found
            </p>
            <p className="text-[10px] text-muted">
              {items.filter((item) => !item.downloadable).length > 0
                ? `${items.filter((item) => !item.downloadable).length} without a direct link`
                : 'Ready to save locally'}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void scan.scan();
            }}
            icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
          >
            Rescan
          </Button>
        </div>

        <LimitationNotice limitations={limitations} />

        <MediaActionBar
          itemCount={selection.selectableCount}
          selectionMode={selectionMode}
          busy={downloads.progress.submitting}
          onDownloadCurrent={onDownloadCurrent}
          onBulkDownload={onBulkDownload}
          onToggleSelection={onToggleSelection}
        />

        <MediaFilters value={filter} onChange={onFilterChange} counts={counts} />

        {filtered.length > 0 ? (
          <MediaGrid
            items={filtered}
            selection={selection}
            selectionMode={selectionMode}
          />
        ) : (
          <EmptyState
            compact
            icon={<ImageIcon className="size-5" aria-hidden="true" />}
            title={`No ${filter === 'image' ? 'photos' : 'videos'} on this page`}
            description="Switch the filter to see the media that was found."
            action={
              <Button variant="secondary" size="sm" onClick={() => onFilterChange('all')}>
                Show all
              </Button>
            }
          />
        )}
      </div>

      <DownloadBar
        progress={downloads.progress}
        onViewLibrary={onOpenLibrary}
        onDismiss={downloads.reset}
      />

      {(selectionMode || selection.selectedCount > 0) && (
        <SelectionBar
          selectedCount={selection.selectedItems.length}
          selectableCount={selection.selectableCount}
          allSelected={selection.allSelected}
          busy={downloads.progress.submitting}
          onSelectAll={selection.selectAll}
          onClear={selection.clear}
          onDownload={onDownload}
        />
      )}
    </div>
  );
}
