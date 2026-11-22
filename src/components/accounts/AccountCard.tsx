import { Check } from 'lucide-react';
import type { PreviewAccount } from '@/types/ui';
import { cn } from '@/utils/cn';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PlatformBadge } from '../media/PlatformBadge';

export interface AccountCardProps {
  account: PreviewAccount;
  selected: boolean;
  onSelect: (account: PreviewAccount) => void;
  busy?: boolean;
}

export function AccountCard({ account, selected, onSelect, busy = false }: AccountCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border bg-surface p-4 transition duration-150',
        selected
          ? 'border-accent ring-1 ring-accent/30'
          : 'border-border hover:-translate-y-0.5 hover:border-muted/40 hover:shadow-md',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex size-10 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm"
          style={{ backgroundColor: account.accent }}
          aria-hidden="true"
        >
          {account.initials}
        </div>
        <PlatformBadge platform={account.platform} />
      </div>

      <div className="mt-3 min-w-0">
        <p className="truncate text-sm font-semibold tracking-tight text-fg">
          {account.displayName}
        </p>
        <p className="truncate text-[11px] text-muted">@{account.handle}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="neutral">{account.accountType}</Badge>
        <span className="text-[10px] text-muted">{account.followersLabel}</span>
      </div>

      <Button
        variant={selected ? 'secondary' : 'primary'}
        size="sm"
        block
        className="mt-4"
        loading={busy}
        onClick={() => onSelect(account)}
        icon={
          selected ? <Check className="size-3.5" aria-hidden="true" /> : undefined
        }
      >
        {selected ? 'Selected for preview' : 'Use for previews'}
      </Button>
    </div>
  );
}
