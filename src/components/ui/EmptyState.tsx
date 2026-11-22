import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-6' : 'px-6 py-10',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-elevated text-muted">
          {icon}
        </div>
      )}
      <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-[36ch] text-xs leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
