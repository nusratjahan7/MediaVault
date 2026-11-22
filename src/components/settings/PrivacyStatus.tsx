import { useEffect, useState } from 'react';
import { Database, Download, ListPlus, Lock, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { getSiteStatuses } from '@/services/permissions';
import { sendToBackground } from '@/services/messaging';
import { getSavedLists, subscribeToSavedLists } from '@/storage/lists';
import { Badge } from '../ui/Badge';

interface PrivacyStats {
  historyEntries: number;
  savedLists: number;
  savedProfiles: number;
  enabledSites: number;
}

const EMPTY_STATS: PrivacyStats = {
  historyEntries: 0,
  savedLists: 0,
  savedProfiles: 0,
  enabledSites: 0,
};

export function PrivacyStatus() {
  const { settings } = useSettings();
  const [stats, setStats] = useState<PrivacyStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToSavedLists((lists) => {
      if (active) {
        setStats((previous) => ({
          ...previous,
          savedLists: lists.length,
          savedProfiles: lists.reduce(
            (count, list) => count + list.accounts.length,
            0,
          ),
        }));
      }
    });

    void Promise.allSettled([
      getSavedLists(),
      getSiteStatuses(),
      sendToBackground({ type: 'HISTORY_QUERY', query: { limit: 1 } }),
    ]).then(([listsResult, sitesResult, historyResult]) => {
      if (!active) {
        return;
      }

      const lists = listsResult.status === 'fulfilled' ? listsResult.value : [];
      const sites = sitesResult.status === 'fulfilled' ? sitesResult.value : [];
      const history =
        historyResult.status === 'fulfilled' && historyResult.value.ok
          ? historyResult.value.data.total
          : 0;

      setStats({
        historyEntries: history,
        savedLists: lists.length,
        savedProfiles: lists.reduce((count, list) => count + list.accounts.length, 0),
        enabledSites: sites.filter((site) => site.enabled).length,
      });
      setLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [settings.historyEnabled]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-success/25 bg-success/5 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-success" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-fg">Local-only mode</p>
            <p className="text-[10px] text-muted">
              Enforced: no backend, cloud sync, analytics, or remote account.
            </p>
          </div>
        </div>
        <Badge tone="success">
          {loading ? 'Checking local state…' : 'Enforced'}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border border-border bg-bg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <Download className="size-3" aria-hidden="true" />
            History
          </div>
          <p className="mt-1 text-sm font-semibold text-fg">
            {settings.historyEnabled ? stats.historyEntries : 'Off'}
          </p>
          <p className="text-[10px] text-muted">
            {settings.historyEnabled ? 'local entries' : 'not stored'}
          </p>
        </div>
        <div className="rounded-md border border-border bg-bg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <ListPlus className="size-3" aria-hidden="true" />
            Saved lists
          </div>
          <p className="mt-1 text-sm font-semibold text-fg">{stats.savedLists}</p>
          <p className="text-[10px] text-muted">{stats.savedProfiles} profiles</p>
        </div>
        <div className="rounded-md border border-border bg-bg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <ShieldCheck className="size-3" aria-hidden="true" />
            Site access
          </div>
          <p className="mt-1 text-sm font-semibold text-fg">{stats.enabledSites}/3</p>
          <p className="text-[10px] text-muted">platforms enabled</p>
        </div>
        <div className="rounded-md border border-border bg-bg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <Database className="size-3" aria-hidden="true" />
            Storage
          </div>
          <p className="mt-1 text-sm font-semibold text-fg">This device</p>
          <p className="text-[10px] text-muted">chrome.storage + IndexedDB</p>
        </div>
      </div>
    </div>
  );
}
