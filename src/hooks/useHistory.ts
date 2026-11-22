import { useCallback, useEffect, useMemo, useState } from 'react';
import { isDownloadsUpdatedEvent, sendToBackground } from '@/services/messaging';
import type { DownloadStatus, HistoryEntry } from '@/types/history';
import type { PlatformId } from '@/types/platform';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';
import { useDebouncedValue } from './useDebouncedValue';

const PAGE_SIZE = 40;

export interface HistoryFilters {
  platform: PlatformId | 'all';
  status: DownloadStatus | 'all';
  search: string;
}

export interface HistoryController {
  filters: HistoryFilters;
  setFilters: (patch: Partial<HistoryFilters>) => void;
  entries: HistoryEntry[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  deleteEntry: (id: string) => Promise<boolean>;
  clearAll: () => Promise<number>;
}

export function useHistory(): HistoryController {
  const [filters, setFiltersState] = useState<HistoryFilters>({
    platform: 'all',
    status: 'all',
    search: '',
  });
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(filters.search, 250);

  const query = useMemo(
    () => ({
      platform: filters.platform,
      status: filters.status,
      search: debouncedSearch,
      limit: PAGE_SIZE,
    }),
    [filters.platform, filters.status, debouncedSearch],
  );

  const requestPage = useCallback(
    async (offset: number) => {
      const response = await sendToBackground({
        type: 'HISTORY_QUERY',
        query: { ...query, offset },
      });

      if (!response.ok) {
        throw fromErrorPayload(response.error);
      }

      return response.data;
    },
    [query],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const page = await requestPage(0);
      setEntries(page.entries);
      setTotal(page.total);
      setHasMore(page.hasMore);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [requestPage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const listener = (message: unknown) => {
      if (isDownloadsUpdatedEvent(message)) {
        void refresh();
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const page = await requestPage(entries.length);
      setEntries((previous) => [...previous, ...page.entries]);
      setTotal(page.total);
      setHasMore(page.hasMore);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoadingMore(false);
    }
  }, [entries.length, hasMore, loadingMore, requestPage]);

  const setFilters = useCallback((patch: Partial<HistoryFilters>) => {
    setFiltersState((previous) => ({ ...previous, ...patch }));
  }, []);

  const deleteEntry = useCallback(
    async (id: string) => {
      const response = await sendToBackground({ type: 'HISTORY_DELETE', id });
      if (!response.ok) {
        throw fromErrorPayload(response.error);
      }

      await refresh();
      return response.data.deleted;
    },
    [refresh],
  );

  const clearAll = useCallback(async () => {
    const response = await sendToBackground({ type: 'HISTORY_CLEAR' });
    if (!response.ok) {
      throw fromErrorPayload(response.error);
    }

    await refresh();
    return response.data.cleared;
  }, [refresh]);

  return {
    filters,
    setFilters,
    entries,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    refresh,
    loadMore,
    deleteEntry,
    clearAll,
  };
}
