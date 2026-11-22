import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastViewport, type ToastMessage } from '@/components/ui/Toast';
import { ToastContext, type ToastInput } from '@/hooks/useToast';
import { createId } from '@/utils/id';

const TOAST_DURATION_MS = 4_500;
const MAX_VISIBLE_TOASTS = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setMessages((previous) => previous.filter((message) => message.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = createId('toast');
      const message: ToastMessage = { id, ...input };

      setMessages((previous) => [...previous, message].slice(-MAX_VISIBLE_TOASTS));

      const timer = window.setTimeout(() => dismiss(id), TOAST_DURATION_MS);
      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport messages={messages} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
