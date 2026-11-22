import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Card } from '../ui/Card';

export interface SectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function Section({ title, description, children, className, id }: SectionProps) {
  return (
    <Card id={id} className={cn('scroll-mt-20 p-4 sm:p-5', className)}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
        {description && (
          <p className="mt-1 max-w-[60ch] text-xs leading-relaxed text-muted">{description}</p>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
