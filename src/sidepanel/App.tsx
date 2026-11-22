import { useMemo, useState } from 'react';
import { Archive, ListVideo, Settings2, Users } from 'lucide-react';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { QueuePreview } from '@/components/queue/QueuePreview';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useDemoHistory } from '@/hooks/useDemoHistory';
import { useHistory } from '@/hooks/useHistory';
import { useQueueActions } from '@/hooks/useQueueActions';
import { useQueuePreview } from '@/hooks/useQueuePreview';
import { useSettings } from '@/hooks/useSettings';
import { openExtensionPage } from '@/services/navigation';
import { STATUS_META } from '@/utils/status';
import { LibraryView } from './LibraryView';
import { SidepanelHeader } from './SidepanelHeader';

type SidepanelTab = 'library' | 'queue';

export function App() {
  const { settings } = useSettings();
  const demo = settings.demoMode;
  const liveHistory = useHistory(!demo);
  const demoHistory = useDemoHistory();
  const history = demo ? demoHistory : liveHistory;
  const queue = useQueuePreview(demo);
  const queueActions = useQueueActions();
  const [tab, setTab] = useState<SidepanelTab>('library');

  const activeQueueCount = useMemo(
    () => queue.items.filter((item) => STATUS_META[item.status].active).length,
    [queue.items],
  );

  const openSettings = () => {
    openExtensionPage('options.html');
  };

  const openHistory = () => {
    openExtensionPage('history.html');
  };

  const openAccounts = () => {
    openExtensionPage('accounts.html');
  };

  const openStories = () => {
    openExtensionPage('stories.html');
  };

  const openRelationships = () => {
    openExtensionPage('relationships.html');
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <SidepanelHeader
        total={history.total}
        onOpenSettings={openSettings}
        onOpenHistory={openHistory}
      />

      {demo && <DemoBanner compact className="m-3 mb-0" />}

      <div className="border-b border-border px-3 py-2">
        <SegmentedControl
          value={tab}
          options={[
            {
              value: 'library',
              label: 'Library',
              icon: <Archive className="size-3" aria-hidden="true" />,
            },
            {
              value: 'queue',
              label: activeQueueCount > 0 ? `Queue ${activeQueueCount}` : 'Queue',
              icon: <ListVideo className="size-3" aria-hidden="true" />,
            },
          ]}
          onChange={setTab}
          ariaLabel="Side panel view"
          className="w-full"
        />
      </div>

      <main className="mv-scrollbar flex-1">
        {tab === 'library' ? (
          <LibraryView
            history={history}
            historyEnabled={settings.historyEnabled}
            mode={demo ? 'demo' : 'live'}
            onOpenSettings={openSettings}
          />
        ) : (
          <div className="space-y-3 p-3">
            <QueuePreview
              controller={queue}
              limit={8}
              onViewAll={openHistory}
              onPause={
                demo
                  ? undefined
                  : (item) => {
                      void queueActions.pause(item.id);
                    }
              }
              onResume={
                demo
                  ? undefined
                  : (item) => {
                      void queueActions.resume(item.id);
                    }
              }
              onCancel={
                demo
                  ? undefined
                  : (item) => {
                      void queueActions.cancel(item.id);
                    }
              }
              onRetry={
                demo
                  ? undefined
                  : (item) => {
                      void queueActions.retry(item.id);
                    }
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={openHistory}
                className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2 py-2 text-[11px] font-medium text-muted transition-colors hover:text-fg"
              >
                <Archive className="size-3.5" aria-hidden="true" />
                Full history
              </button>
              <button
                type="button"
                onClick={openAccounts}
                className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-2 py-2 text-[11px] font-medium text-muted transition-colors hover:text-fg"
              >
                <Users className="size-3.5" aria-hidden="true" />
                Accounts
              </button>
            </div>
            <p className="px-2 text-center text-[10px] leading-relaxed text-muted">
              {demo
                ? 'Simulated queue activity for interface preview.'
                : 'Queue progress comes from Chrome Downloads and local history.'}
            </p>
          </div>
        )}
      </main>

      <footer className="flex items-center justify-center gap-3 border-t border-border bg-surface px-3 py-2 text-[10px] text-muted">
        <button type="button" onClick={openHistory} className="hover:text-fg">
          History
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={openStories} className="hover:text-fg">
          Stories
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={openAccounts} className="hover:text-fg">
          Accounts
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" onClick={openRelationships} className="hover:text-fg">
          Export
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          onClick={openSettings}
          className="inline-flex items-center gap-1 hover:text-fg"
        >
          <Settings2 className="size-3" aria-hidden="true" />
          Settings
        </button>
      </footer>
    </div>
  );
}
