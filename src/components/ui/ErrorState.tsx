import { AlertTriangle, RotateCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-6' : 'px-6 py-10',
        className,
      )}
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-danger/10 text-danger">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>
      <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
      <p className="mt-1.5 max-w-[40ch] text-xs leading-relaxed text-muted">{description}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onRetry}
          icon={<RotateCw className="size-3.5" aria-hidden="true" />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
