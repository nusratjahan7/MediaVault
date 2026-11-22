import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { BrandMark } from './BrandMark';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  brand?: boolean;
  className?: string;
}

export function Header({ title, subtitle, actions, brand = true, className }: HeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {brand && <BrandMark />}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-fg">{title}</p>
          {subtitle && <p className="truncate text-[11px] text-muted">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}
