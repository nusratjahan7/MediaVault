import { useCallback, useEffect, useRef, useState } from 'react';
import { isDownloadsUpdatedEvent, sendToBackground } from '@/services/messaging';
import type { EnqueueResult } from '@/types/download';
import type { DownloadStatus } from '@/types/history';
import type { MediaItem } from '@/types/media';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';

export interface DownloadProgress {
  submitting: boolean;
  total: number;
  completed: number;
  failed: number;
  active: number;
  error: string | null;
}

export interface DownloadController {
  progress: DownloadProgress;
  enqueue: (items: MediaItem[]) => Promise<EnqueueResult | null>;
  reset: () => void;
}

const EMPTY_PROGRESS: DownloadProgress = {
  submitting: false,
  total: 0,
  completed: 0,
  failed: 0,
  active: 0,
  error: null,
};

export function useDownloads(): DownloadController {
  const [progress, setProgress] = useState<DownloadProgress>(EMPTY_PROGRESS);
  const acceptedRef = useRef<Set<string>>(new Set());
  const statusesRef = useRef<Map<string, DownloadStatus>>(new Map());

  useEffect(() => {
    const listener = (message: unknown) => {
      if (!isDownloadsUpdatedEvent(message)) {
        return;
      }

      let changed = false;

      for (const entry of message.entries) {
        if (!acceptedRef.current.has(entry.id)) {
          continue;
        }

        if (statusesRef.current.get(entry.id) !== entry.status) {
          statusesRef.current.set(entry.id, entry.status);
          changed = true;
        }
      }

      if (!changed) {
        return;
      }

      const statuses = [...statusesRef.current.values()];
      setProgress((previous) => ({
        ...previous,
        completed: statuses.filter((status) => status === 'completed').length,
        failed: statuses.filter(
          (status) => status === 'failed' || status === 'interrupted',
        ).length,
        active: statuses.filter(
          (status) => status === 'queued' || status === 'downloading',
        ).length,
      }));
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const enqueue = useCallback(async (items: MediaItem[]): Promise<EnqueueResult | null> => {
    if (items.length === 0) {
      return null;
    }

    acceptedRef.current = new Set();
    statusesRef.current = new Map();
    setProgress({
      submitting: true,
      total: items.length,
      completed: 0,
      failed: 0,
      active: 0,
      error: null,
    });

    try {
      const response = await sendToBackground({ type: 'DOWNLOAD_ITEMS', items });
      if (!response.ok) {
        throw fromErrorPayload(response.error);
      }

      const acceptedIds = response.data.accepted.map((job) => job.id);
      acceptedRef.current = new Set(acceptedIds);
      for (const id of acceptedIds) {
        statusesRef.current.set(id, 'queued');
      }

      setProgress({
        submitting: false,
        total: acceptedIds.length,
        completed: 0,
        failed: 0,
        active: acceptedIds.length,
        error: null,
      });

      return response.data;
    } catch (caught) {
      const message = getErrorMessage(caught);
      setProgress((previous) => ({
        ...previous,
        submitting: false,
        error: message,
        active: 0,
      }));
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    acceptedRef.current = new Set();
    statusesRef.current = new Map();
    setProgress(EMPTY_PROGRESS);
  }, []);

  return { progress, enqueue, reset };
}
