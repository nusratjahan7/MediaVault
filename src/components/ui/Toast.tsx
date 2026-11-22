import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { IconButton } from './IconButton';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export interface ToastViewportProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
  className?: string;
}

const ICONS = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const;

const TONES: Record<ToastVariant, string> = {
  default: 'text-accent',
  success: 'text-success',
  error: 'text-danger',
};

export function ToastViewport({ messages, onDismiss, className }: ToastViewportProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80',
        className,
      )}
    >
      {messages.map((message) => {
        const variant = message.variant ?? 'default';
        const Icon = ICONS[variant];

        return (
          <div
            key={message.id}
            role={variant === 'error' ? 'alert' : 'status'}
            className="animate-rise pointer-events-auto flex items-start gap-2.5 rounded-lg border border-border bg-elevated p-3 shadow-lg"
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', TONES[variant])} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-fg">{message.title}</p>
              {message.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  {message.description}
                </p>
              )}
            </div>
            <IconButton
              label="Dismiss notification"
              size="sm"
              className="-mt-1 -mr-1"
              onClick={() => onDismiss(message.id)}
            >
              <X className="size-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
