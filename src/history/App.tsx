import { useState } from 'react';
import {
  Archive,
  CircleAlert,
  CircleCheck,
  Clock3,
  Moon,
  Sun,
  Trash2,
} from 'lucide-react';
import { HistoryFilters } from '@/components/history/HistoryFilters';
import { HistoryList } from '@/components/history/HistoryList';
import { PageShell } from '@/components/layout/PageShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { IconButton } from '@/components/ui/IconButton';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { showDownload } from '@/downloads/client';
import { useDemoHistory } from '@/hooks/useDemoHistory';
import { useHistory } from '@/hooks/useHistory';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { sendToBackground } from '@/services/messaging';
import type { HistoryEntry } from '@/types/history';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';
import { pluralize } from '@/utils/format';
import { STATUS_META } from '@/utils/status';

export function App() {
  const { settings } = useSettings();
  const demo = settings.demoMode;
  const liveHistory = useHistory(!demo);
  const demoHistory = useDemoHistory();
  const history = demo ? demoHistory : liveHistory;
  const { resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();

  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const savedCount = history.entries.filter((entry) => entry.status === 'completed').length;
  const activeCount = history.entries.filter(
    (entry) => STATUS_META[entry.status].active,
  ).length;
  const attentionCount = history.entries.filter(
    (entry) => entry.status === 'failed' || entry.status === 'interrupted',
  ).length;

  const handleReveal = async (entry: HistoryEntry) => {
    if (demo) {
      toast({
        title: 'Preview only',
        description: 'Sample entries are not connected to files on disk.',
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

    if (!(await showDownload(entry.downloadId))) {
      toast({
        title: 'Could not reveal file',
        description: 'The file may have been moved or deleted.',
        variant: 'error',
      });
    }
  };

  const handleRetry = async (entry: HistoryEntry) => {
    if (demo) {
      toast({
        title: 'Preview: retry queued',
        description: 'Demo mode does not start a real download.',
      });
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
        title: response.data.retried ? 'Download queued' : 'Could not retry',
        description: response.data.retried
          ? 'The existing entry was restarted with a fresh browser download.'
          : 'Only failed or cancelled downloads can be retried. If the link expired, scan the page again.',
        variant: response.data.retried ? 'success' : 'error',
      });
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
      toast({
        title: 'Preview only',
        description: 'Demo mode does not control a real download.',
      });
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
          : 'The file completed before the cancellation request.',
        variant: response.data.cancelled ? 'success' : 'default',
      });
    } catch (caught) {
      toast({
        title: 'Could not cancel',
        description: getErrorMessage(caught),
        variant: 'error',
      });
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
      toast({
        title: 'Could not remove entry',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    }
  };

  const handleClear = async () => {
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
      toast({
        title: 'Could not clear history',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <PageShell
      active="history"
      title="Download history"
      description="Review, retry, and manage downloads saved on this device. History never leaves your browser."
      actions={
        <>
          {demo && <Badge tone="accent">Demo data</Badge>}
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total"
          value={history.total}
          hint="local entries"
          icon={<Archive className="size-4" />}
        />
        <StatCard
          label="Saved"
          value={savedCount}
          hint="completed"
          tone="success"
          icon={<CircleCheck className="size-4" />}
        />
        <StatCard
          label="In progress"
          value={activeCount}
          hint="queued or active"
          tone="accent"
          icon={<Clock3 className="size-4" />}
        />
        <StatCard
          label="Attention"
          value={attentionCount}
          hint="failed or interrupted"
          tone="danger"
          icon={<CircleAlert className="size-4" />}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-3">
          <HistoryFilters filters={history.filters} onChange={history.setFilters} />
        </div>
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
          onCancel={(entry) => {
            void handleCancel(entry);
          }}
          onDelete={(entry) => {
            void handleDelete(entry);
          }}
        />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] leading-relaxed text-muted">
          History is stored in IndexedDB on this device. Removing an entry never deletes the
          file.
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setConfirmClear(true)}
          disabled={history.total === 0}
          icon={<Trash2 className="size-3.5" aria-hidden="true" />}
        >
          Clear history
        </Button>
      </div>

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
            <Button
              variant="danger"
              size="sm"
              onClick={() => void handleClear()}
              loading={clearing}
            >
              Clear history
            </Button>
          </>
        }
      />
    </PageShell>
  );
}
