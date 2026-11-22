import { ArrowLeftRight, ExternalLink } from 'lucide-react';
import type { PageContext, PreviewAccount } from '@/types/ui';
import { pageKindLabel } from '@/utils/page-context';
import { cn } from '@/utils/cn';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { PlatformBadge } from '../media/PlatformBadge';

export interface PageContextCardProps {
  context: PageContext;
  account?: PreviewAccount;
  onSwitchAccount?: () => void;
  compact?: boolean;
  className?: string;
}

function initialsFrom(value: string | undefined): string {
  if (!value) {
    return 'MV';
  }

  return value
    .replace(/^@/, '')
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function PageContextCard({
  context,
  account,
  onSwitchAccount,
  compact = false,
  className,
}: PageContextCardProps) {
  const name = context.accountName ?? context.author ?? 'Page visitor';
  const handle = context.handle ?? context.author;
  const initials = account?.initials ?? initialsFrom(handle ?? name);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className={cn(compact ? 'p-3' : 'p-4')}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={context.platform} />
            <span className="text-[10px] text-muted">·</span>
            <span className="text-[10px] font-medium text-muted">
              {pageKindLabel(context.pageKind)}
            </span>
          </div>
          <Badge tone={context.mode === 'demo' ? 'accent' : 'neutral'}>
            {context.mode === 'demo' ? 'Demo data' : 'Live page'}
          </Badge>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white shadow-sm ring-2 ring-white/20"
            style={{ backgroundColor: account?.accent ?? '#5B5BD6' }}
            aria-hidden="true"
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-fg">{name}</p>
            <p className="truncate text-[11px] text-muted">
              {handle ? `@${handle.replace(/^@/, '')}` : 'Page context'}
              {account ? ` · ${account.accountType}` : ''}
              {context.mediaCount > 0 ? ` · ${context.mediaCount} media` : ''}
            </p>
          </div>

          {onSwitchAccount && (
            <button
              type="button"
              onClick={onSwitchAccount}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-muted transition-colors hover:bg-elevated hover:text-fg"
            >
              <ArrowLeftRight className="size-3" aria-hidden="true" />
              Switch
            </button>
          )}
        </div>

        <p
          className={cn(
            'mt-2.5 text-[11px] leading-relaxed text-muted',
            compact ? 'line-clamp-2' : 'line-clamp-3',
          )}
          title={context.pageTitle}
        >
          {context.pageTitle}
        </p>

        {context.pageUrl && !compact && (
          <p className="mt-2 flex items-center gap-1 truncate text-[10px] text-muted">
            <ExternalLink className="size-2.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{context.pageUrl.replace(/^https?:\/\//, '')}</span>
          </p>
        )}
      </div>
    </Card>
  );
}
