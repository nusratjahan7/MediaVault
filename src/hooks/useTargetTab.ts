import { useEffect, useState } from 'react';
import { getTabUrl } from '@/services/tabs';
import { getErrorMessage } from '@/utils/errors';

export interface TargetTabState {
  tab: chrome.tabs.Tab | undefined;
  url: URL | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SUPPORTED_TAB_PATTERNS = [
  'https://*.instagram.com/*',
  'https://*.facebook.com/*',
  'https://*.tiktok.com/*',
];

export function useTargetTab(): TargetTabState {
  const [tab, setTab] = useState<chrome.tabs.Tab>();
  const [url, setUrl] = useState<URL | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const tabIdParam = new URLSearchParams(window.location.search).get('tabId');

      if (tabIdParam) {
        const next = await chrome.tabs.get(Number(tabIdParam));
        setTab(next);
        setUrl(getTabUrl(next));
        return;
      }

      const tabs = await chrome.tabs.query({ url: SUPPORTED_TAB_PATTERNS });
      const next = tabs.find((candidate) => candidate.active) ?? tabs[0];
      setTab(next);
      setUrl(getTabUrl(next));

      if (!next) {
        setError(
          'No supported social tab found. Open an Instagram, Facebook, or TikTok page, then launch this manager from the popup.',
        );
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { tab, url, loading, error, refresh };
}
