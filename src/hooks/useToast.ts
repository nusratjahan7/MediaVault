import { createContext, useContext } from 'react';
import type { ToastMessage } from '@/components/ui/Toast';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastMessage['variant'];
}

export interface ToastContextValue {
  toast: (input: ToastInput) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }

  return context;
}
