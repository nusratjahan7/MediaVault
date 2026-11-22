import type { QueuePreviewController } from '@/types/ui';
import { useLiveQueue } from './useLiveQueue';
import { useMockQueue } from './useMockQueue';

export function useQueuePreview(demoMode: boolean): QueuePreviewController {
  const live = useLiveQueue(!demoMode);
  const mock = useMockQueue(demoMode);

  if (demoMode) {
    return {
      mode: 'demo',
      items: mock.items,
      loading: false,
      error: null,
      refresh: mock.refresh,
      addMockMedia: mock.addMedia,
      reset: mock.reset,
    };
  }

  return {
    mode: 'live',
    items: live.items,
    loading: live.loading,
    error: live.error,
    refresh: live.refresh,
  };
}
