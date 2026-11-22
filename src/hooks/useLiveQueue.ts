import { useCallback, useEffect, useState } from 'react';
import {
  isDownloadsUpdatedEvent,
  sendToBackground,
} from '@/services/messaging';
import type { HistoryEntry } from '@/types/history';
import type { QueuePreviewItem } from '@/types/ui';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';
import { formatBytes } from '@/utils/format';
import { STATUS_META } from '@/utils/status';

const MAX_VISIBLE_ITEMS = 8;
const RECENT_FINISHED_ITEMS = 2;

function toPreviewItem(entry: HistoryEntry): QueuePreviewItem {
  const totalBytes =
    entry.totalBytes && entry.totalBytes > 0 ? entry.totalBytes : undefined;
  const progress =
    entry.status === 'completed'
      ? 100
      : entry.status === 'queued'
        ? 0
        : entry.status === 'downloading' &&
            totalBytes !== undefined &&
            entry.bytesReceived !== undefined
          ? Math.min(99, Math.round((entry.bytesReceived / totalBytes) * 100))
          : undefined;
  const dimensions =
    entry.item.width && entry.item.height
      ? `${entry.item.width}×${entry.item.height}`
      : undefined;
  const sizeLabel =
    entry.bytesReceived && totalBytes
      ? `${formatBytes(entry.bytesReceived)} / ${formatBytes(totalBytes)}`
      : entry.bytesReceived
        ? formatBytes(entry.bytesReceived)
        : dimensions;

  return {
    id: entry.id,
    platform: entry.item.platform,
    kind: entry.item.kind,
    filename: entry.filename.split('/').pop() ?? entry.filename,
    status: entry.status,
    progress,
    paused: entry.paused,
    thumbnailUrl: entry.item.thumbnailUrl,
    sizeLabel,
    outputLabel: entry.output?.label,
    error: entry.error,
    createdAt: entry.createdAt,
  };
}

export interface LiveQueueController {
  items: QueuePreviewItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLiveQueue(enabled: boolean): LiveQueueController {
  const [items, setItems] = useState<QueuePreviewItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      const response = await sendToBackground({
        type: 'HISTORY_QUERY',
        query: { limit: 40 },
      });

      if (!response.ok) {
        throw fromErrorPayload(response.error);
      }

      const entries = response.data.entries;
      const active = entries
        .filter((entry) => STATUS_META[entry.status].active)
        .sort((a, b) => a.createdAt - b.createdAt);
      const recent = entries
        .filter((entry) => !STATUS_META[entry.status].active)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, RECENT_FINISHED_ITEMS);

      setItems([...active, ...recent].slice(0, MAX_VISIBLE_ITEMS).map(toPreviewItem));
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

  return { items, loading, error, refresh };
}
