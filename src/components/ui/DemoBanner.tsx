import { Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface DemoBannerProps {
  compact?: boolean;
  className?: string;
}

export function DemoBanner({ compact = false, className }: DemoBannerProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-accent/25 bg-accent/5 text-accent',
        compact ? 'px-2.5 py-2' : 'p-3',
        className,
      )}
    >
      <Sparkles className={cn('mt-0.5 shrink-0', compact ? 'size-3.5' : 'size-4')} aria-hidden="true" />
      <p className={cn('leading-relaxed', compact ? 'text-[10px]' : 'text-xs')}>
        <span className="font-semibold">UI preview.</span> Sample data only — downloads are
        simulated and no platform account or session is accessed.
      </p>
    </div>
  );
}
