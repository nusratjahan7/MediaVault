import { useCallback, useEffect, useState } from 'react';
import {
  isDownloadsUpdatedEvent,
  sendToBackground,
} from '@/services/messaging';
import type { DashboardSnapshot } from '@/types/dashboard';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  entries: [],
  counts: {
    queued: 0,
    downloading: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    interrupted: 0,
  },
  completedFiles: 0,
  completedBytes: 0,
  completedWithBytes: 0,
};

export interface DashboardController {
  snapshot: DashboardSnapshot;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearCompleted: () => Promise<number>;
}

export function useDashboard(enabled: boolean): DashboardController {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setSnapshot(EMPTY_SNAPSHOT);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const response = await sendToBackground({ type: 'DASHBOARD_QUERY' });
      if (!response.ok) {
        throw fromErrorPayload(response.error);
      }
      setSnapshot(response.data);
      setError(null);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const listener = (message: unknown) => {
      if (isDownloadsUpdatedEvent(message)) {
        void refresh();
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [enabled, refresh]);

  const clearCompleted = useCallback(async () => {
    const response = await sendToBackground({ type: 'DASHBOARD_CLEAR_COMPLETED' });
    if (!response.ok) {
      throw fromErrorPayload(response.error);
    }

    await refresh();
    return response.data.cleared;
  }, [refresh]);

  return { snapshot, loading, error, refresh, clearCompleted };
}
