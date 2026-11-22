import { useCallback } from 'react';
import { sendToBackground } from '@/services/messaging';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';
import { useToast } from './useToast';

export interface QueueActions {
  pause: (historyId: string) => Promise<void>;
  resume: (historyId: string) => Promise<void>;
  cancel: (historyId: string) => Promise<void>;
  retry: (historyId: string) => Promise<void>;
}

export function useQueueActions(): QueueActions {
  const { toast } = useToast();

  const pause = useCallback(
    async (historyId: string) => {
      try {
        const response = await sendToBackground({
          type: 'PAUSE_DOWNLOAD',
          historyId,
        });
        if (!response.ok) {
          throw fromErrorPayload(response.error);
        }

        toast({
          title: response.data.paused ? 'Download paused' : 'Pause not supported',
          description: response.data.paused
            ? 'Resume it from the queue when ready.'
            : 'Chrome could not pause this download.',
          variant: response.data.paused ? 'success' : 'default',
        });
      } catch (caught) {
        toast({
          title: 'Could not pause download',
          description: getErrorMessage(caught),
          variant: 'error',
        });
      }
    },
    [toast],
  );

  const resume = useCallback(
    async (historyId: string) => {
      try {
        const response = await sendToBackground({
          type: 'RESUME_DOWNLOAD',
          historyId,
        });
        if (!response.ok) {
          throw fromErrorPayload(response.error);
        }

        toast({
          title: response.data.resumed ? 'Download resumed' : 'Resume not supported',
          description: response.data.resumed
            ? 'The download continues in Chrome.'
            : 'Chrome could not resume this download.',
          variant: response.data.resumed ? 'success' : 'default',
        });
      } catch (caught) {
        toast({
          title: 'Could not resume download',
          description: getErrorMessage(caught),
          variant: 'error',
        });
      }
    },
    [toast],
  );

  const cancel = useCallback(
    async (historyId: string) => {
      try {
        const response = await sendToBackground({
          type: 'CANCEL_DOWNLOAD',
          historyId,
        });
        if (!response.ok) {
          throw fromErrorPayload(response.error);
        }

        toast({
          title: response.data.cancelled
            ? 'Cancelling download'
            : 'Download already finished',
          description: response.data.cancelled
            ? 'Chrome will confirm the cancellation.'
            : 'The file completed before the cancellation request.',
          variant: response.data.cancelled ? 'success' : 'default',
        });
      } catch (caught) {
        toast({
          title: 'Could not cancel download',
          description: getErrorMessage(caught),
          variant: 'error',
        });
      }
    },
    [toast],
  );

  const retry = useCallback(
    async (historyId: string) => {
      try {
        const response = await sendToBackground({
          type: 'RETRY_DOWNLOAD',
          historyId,
        });
        if (!response.ok) {
          throw fromErrorPayload(response.error);
        }

        toast({
          title: response.data.retried ? 'Download queued' : 'Could not retry',
          description: response.data.retried
            ? 'A fresh browser download was started.'
            : 'Only failed or cancelled downloads can be retried.',
          variant: response.data.retried ? 'success' : 'error',
        });
      } catch (caught) {
        toast({
          title: 'Could not retry download',
          description: getErrorMessage(caught),
          variant: 'error',
        });
      }
    },
    [toast],
  );

  return { pause, resume, cancel, retry };
}
