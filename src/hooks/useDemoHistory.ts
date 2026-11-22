import { useCallback, useMemo, useState } from 'react';
import { MOCK_HISTORY } from '@/mocks/history';
import type { HistoryEntry } from '@/types/history';
import type { HistoryController, HistoryFilters } from './useHistory';
import { useDebouncedValue } from './useDebouncedValue';

export function useDemoHistory(): HistoryController {
  const [filters, setFiltersState] = useState<HistoryFilters>({
    platform: 'all',
    status: 'all',
    search: '',
  });
  const [entries, setEntries] = useState<HistoryEntry[]>(() =>
    MOCK_HISTORY.map((entry) => ({ ...entry, item: { ...entry.item } })),
  );
  const debouncedSearch = useDebouncedValue(filters.search, 250);

  const filtered = useMemo(() => {
    const search = debouncedSearch.trim().toLowerCase();

    return entries
      .filter((entry) => {
        if (filters.platform !== 'all' && entry.item.platform !== filters.platform) {
          return false;
        }
        if (filters.status !== 'all' && entry.status !== filters.status) {
          return false;
        }
        if (search) {
          const haystack = [
            entry.filename,
            entry.item.author,
            entry.item.caption,
            entry.item.platform,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(search)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [entries, filters.platform, filters.status, debouncedSearch]);

  const setFilters = useCallback((patch: Partial<HistoryFilters>) => {
    setFiltersState((previous) => ({ ...previous, ...patch }));
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    setEntries((previous) => previous.filter((entry) => entry.id !== id));
    return true;
  }, []);

  const clearAll = useCallback(async () => {
    const count = entries.length;
    setEntries([]);
    return count;
  }, [entries.length]);

  return {
    filters,
    setFilters,
    entries: filtered,
    total: filtered.length,
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: null,
    refresh: async () => undefined,
    loadMore: async () => undefined,
    deleteEntry,
    clearAll,
  };
}
