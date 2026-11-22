import { useCallback, useEffect, useState } from 'react';
import {
  advanceMockQueue,
  createInitialMockQueue,
  createMockQueueItemsFromMedia,
} from '@/mocks/queue';
import type { MediaItem } from '@/types/media';
import type { QueuePreviewItem } from '@/types/ui';

const TICK_MS = 1_400;
const MAX_QUEUE_ITEMS = 12;

export interface MockQueueController {
  items: QueuePreviewItem[];
  addMedia: (media: MediaItem[]) => void;
  reset: () => void;
  refresh: () => Promise<void>;
}

export function useMockQueue(enabled: boolean): MockQueueController {
  const [items, setItems] = useState<QueuePreviewItem[]>(() =>
    enabled ? createInitialMockQueue() : [],
  );

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }

    setItems(createInitialMockQueue());
    const timer = window.setInterval(() => {
      setItems((previous) => advanceMockQueue(previous));
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [enabled]);

  const addMedia = useCallback((media: MediaItem[]) => {
    setItems((previous) =>
      [...createMockQueueItemsFromMedia(media), ...previous].slice(0, MAX_QUEUE_ITEMS),
    );
  }, []);

  const reset = useCallback(() => {
    setItems([]);
  }, []);

  const refresh = useCallback(async () => {
    if (enabled) {
      setItems(createInitialMockQueue());
    }
  }, [enabled]);

  return { items, addMedia, reset, refresh };
}
