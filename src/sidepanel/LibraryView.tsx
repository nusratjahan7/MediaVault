import { useState } from 'react';
import { Info } from 'lucide-react';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { HistoryList } from '@/components/history/HistoryList';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { showDownload } from '@/downloads/client';
import type { HistoryController } from '@/hooks/useHistory';
import { useToast } from '@/hooks/useToast';
import { sendToBackground } from '@/services/messaging';
import type { HistoryEntry } from '@/types/history';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';
import { pluralize } from '@/utils/format';

export interface LibraryViewProps {
  history: HistoryController;
  historyEnabled: boolean;
  mode: 'live' | 'demo';
  onOpenSettings: () => void;
}

export function LibraryView({
  history,
  historyEnabled,
  mode,
  onOpenSettings,
}: LibraryViewProps) {
  const { toast } = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleReveal = async (entry: HistoryEntry) => {
    if (mode === 'demo') {
      toast({
        title: 'Preview only',
        description: 'Sample history entries are not connected to real files.',
        variant: 'default',
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

    const shown = await showDownload(entry.downloadId);
    if (!shown) {
      toast({
        title: 'Could not reveal file',
        description: 'The file may have been moved or deleted.',
        variant: 'error',
      });
    }
  };

  const handleRetry = async (entry: HistoryEntry) => {
    if (mode === 'demo') {
      toast({
        title: 'Preview: retry queued',
        description: 'Demo mode does not start a real download.',
        variant: 'default',
      });
      return;
    }

    try {
      const response = await sendToBackground({
        type: 'DOWNLOAD_ITEMS',
        items: [entry.item],
      });

      if (!response.ok) {
        throw fromErrorPayload(response.error);
      }

      if (response.data.accepted.length === 0) {
        toast({
          title: 'No direct link',
          description: 'Open the original page and scan again for a fresh link.',
          variant: 'error',
        });
        return;
      }

      toast({
        title: 'Download queued',
        description: 'A fresh download was added to the queue.',
        variant: 'success',
      });
    } catch (caught) {
      toast({ title: 'Could not retry', description: getErrorMessage(caught), variant: 'error' });
    }
  };

  const handleDelete = async (entry: HistoryEntry) => {
    try {
      await history.deleteEntry(entry.id);
      toast({
        title: 'Removed from history',
        description: 'The downloaded file was not deleted.',
        variant: 'success',
      });
    } catch (caught) {
      toast({ title: 'Could not remove entry', description: getErrorMessage(caught), variant: 'error' });
    }
  };

  const handleClearAll = async () => {
    setClearing(true);

    try {
      const cleared = await history.clearAll();
      toast({
        title: 'History cleared',
        description: `${cleared} ${pluralize(cleared, 'entry', 'entries')} removed. Downloaded files stay on disk.`,
        variant: 'success',
      });
      setConfirmClear(false);
    } catch (caught) {
      toast({ title: 'Could not clear history', description: getErrorMessage(caught), variant: 'error' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-3 p-3">
      {!historyEnabled && (
        <div className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/5 p-2.5 text-[11px] leading-relaxed text-warning">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <p>
            Download history is off, so new downloads will not appear here.{' '}
            <button
              type="button"
              onClick={onOpenSettings}
              className="font-medium underline underline-offset-2"
            >
              Turn it on in settings
            </button>
            .
          </p>
        </div>
      )}

      <HistoryFilters filters={history.filters} onChange={history.setFilters} />

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          {history.total} {pluralize(history.total, 'entry', 'entries')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmClear(true)}
          disabled={history.total === 0}
        >
          Clear all
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <HistoryList
          entries={history.entries}
          loading={history.loading}
          loadingMore={history.loadingMore}
          hasMore={history.hasMore}
          error={history.error}
          onRefresh={() => {
            void history.refresh();
          }}
          onLoadMore={() => {
            void history.loadMore();
          }}
          onReveal={(entry) => {
            void handleReveal(entry);
          }}
          onRetry={(entry) => {
            void handleRetry(entry);
          }}
          onDelete={(entry) => {
            void handleDelete(entry);
          }}
        />
      </div>

      <p className="px-1 pb-2 text-center text-[10px] leading-relaxed text-muted">
        History is stored locally in IndexedDB. Removing an entry never deletes the file.
      </p>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear download history?"
        description="This removes every local history entry. Downloaded files are not deleted."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => void handleClearAll()} loading={clearing}>
              Clear history
            </Button>
          </>
        }
      />
    </div>
  );
}
