import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Card } from './Card';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}

const TONES = {
  default: 'text-muted',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('p-3.5', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium tracking-wide text-muted uppercase">{label}</p>
        {icon && (
          <span className={cn('shrink-0', TONES[tone])} aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-fg tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] leading-relaxed text-muted">{hint}</p>}
    </Card>
  );
}
