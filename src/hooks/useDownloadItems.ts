import { useCallback, useState } from 'react';
import { sendToBackground } from '@/services/messaging';
import type { MediaItem } from '@/types/media';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';
import { useToast } from './useToast';

export interface DownloadItemsAction {
  busyKey: string | null;
  enqueue: (items: MediaItem[], key: string, label: string) => Promise<void>;
}

export function useDownloadItems(): DownloadItemsAction {
  const { toast } = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const enqueue = useCallback(
    async (items: MediaItem[], key: string, label: string) => {
      const downloadable = items.filter(
        (item) => item.downloadable && /^https?:\/\//i.test(item.url),
      );

      if (downloadable.length === 0) {
        toast({
          title: 'No downloadable media',
          description: 'This item does not expose a direct file that MediaVault can save.',
          variant: 'error',
        });
        return;
      }

      setBusyKey(key);

      try {
        const response = await sendToBackground({
          type: 'DOWNLOAD_ITEMS',
          items: downloadable,
        });

        if (!response.ok) {
          throw fromErrorPayload(response.error);
        }

        const { accepted, skipped, alreadyDownloaded } = response.data;

        if (accepted.length > 0) {
          const extra: string[] = [];
          if (alreadyDownloaded > 0) {
            extra.push(`${alreadyDownloaded} already downloaded`);
          }
          if (skipped > 0) {
            extra.push(`${skipped} unavailable`);
          }

          toast({
            title: `${label}: ${accepted.length} queued`,
            description:
              extra.length > 0
                ? extra.join(' · ')
                : 'Follow progress in the download library.',
            variant: 'success',
          });
          return;
        }

        toast({
          title:
            alreadyDownloaded > 0 ? 'Already downloaded' : 'Nothing to download',
          description:
            alreadyDownloaded > 0
              ? 'Skip Downloaded is enabled and these items are already in history.'
              : 'No direct media link was available.',
          variant: alreadyDownloaded > 0 ? 'default' : 'error',
        });
      } catch (caught) {
        toast({
          title: `Could not queue ${label.toLowerCase()}`,
          description: getErrorMessage(caught),
          variant: 'error',
        });
      } finally {
        setBusyKey(null);
      }
    },
    [toast],
  );

  return { busyKey, enqueue };
}
