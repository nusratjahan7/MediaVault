import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Info, ShieldAlert } from 'lucide-react';
import type { LimitationSeverity, ScanLimitation } from '@/types/media';
import { cn } from '@/utils/cn';

const ORDER: Record<LimitationSeverity, number> = {
  blocking: 0,
  warning: 1,
  info: 2,
};

const STYLES: Record<LimitationSeverity, string> = {
  blocking: 'border-danger/25 bg-danger/5 text-danger',
  warning: 'border-warning/25 bg-warning/5 text-warning',
  info: 'border-border bg-elevated text-muted',
};

const ICONS = {
  blocking: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
};

export function LimitationNotice({ limitations }: { limitations: ScanLimitation[] }) {
  const [expanded, setExpanded] = useState(false);

  const ordered = useMemo(
    () => [...limitations].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]),
    [limitations],
  );

  if (ordered.length === 0) {
    return null;
  }

  const visible = expanded ? ordered : ordered.slice(0, 1);

  return (
    <div className="space-y-1.5">
      {visible.map((limitation) => {
        const Icon = ICONS[limitation.severity];

        return (
          <div
            key={limitation.code}
            className={cn(
              'flex gap-2 rounded-md border px-2.5 py-2 text-[11px] leading-relaxed',
              STYLES[limitation.severity],
            )}
          >
            <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <p>{limitation.message}</p>
          </div>
        );
      })}

      {ordered.length > 1 && (
        <button
          type="button"
          onClick={() => setExpanded((previous) => !previous)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-fg"
        >
          <ChevronDown
            className={cn('size-3 transition-transform', expanded && 'rotate-180')}
            aria-hidden="true"
          />
          {expanded ? 'Show less' : `Show ${ordered.length - 1} more`}
        </button>
      )}
    </div>
  );
}
