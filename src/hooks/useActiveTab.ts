import { useCallback, useEffect, useState } from 'react';
import { getActiveTab, getTabUrl } from '@/services/tabs';
import { getErrorMessage } from '@/utils/errors';

export interface ActiveTabState {
  tab: chrome.tabs.Tab | undefined;
  url: URL | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useActiveTab(): ActiveTabState {
  const [tab, setTab] = useState<chrome.tabs.Tab>();
  const [url, setUrl] = useState<URL | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const next = await getActiveTab();
      setTab(next);
      setUrl(getTabUrl(next));

      if (!next) {
        setError('No active tab is available.');
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tab, url, loading, error, refresh };
}
