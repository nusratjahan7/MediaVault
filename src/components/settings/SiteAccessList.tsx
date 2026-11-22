import { Check, ExternalLink, ShieldOff } from 'lucide-react';
import { PLATFORM_IDS, PLATFORM_META } from '@/constants';
import { useSiteAccess } from '@/hooks/useSiteAccess';
import { useToast } from '@/hooks/useToast';
import type { PlatformId } from '@/types/platform';
import { cn } from '@/utils/cn';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { PlatformBadge } from '../media/PlatformBadge';

function SiteRow({ platform }: { platform: PlatformId }) {
  const { status, loading, busy, enable, disable } = useSiteAccess(platform);
  const { toast } = useToast();
  const meta = PLATFORM_META[platform];

  const handleEnable = async () => {
    const result = await enable();
    if (result.ok) {
      toast({
        title: `${meta.label} enabled`,
        description: 'Open a post in this tab, then use the MediaVault popup to scan.',
        variant: 'success',
      });
    } else if (result.error) {
      toast({ title: 'Site access not granted', description: result.error, variant: 'error' });
    }
  };

  const handleDisable = async () => {
    const result = await disable();
    if (result.ok) {
      toast({
        title: `${meta.label} access revoked`,
        description: 'MediaVault can no longer read this site.',
        variant: 'success',
      });
    } else if (result.error) {
      toast({ title: 'Could not revoke access', description: result.error, variant: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-elevated">
          <PlatformBadge platform={platform} showLabel={false} className="text-fg" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-fg">{meta.label}</p>
            {loading ? (
              <Spinner className="size-3" />
            ) : status?.enabled ? (
              <Badge tone="success">
                <Check className="size-2.5" aria-hidden="true" />
                Enabled
              </Badge>
            ) : (
              <Badge tone="neutral">Off</Badge>
            )}
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{meta.description}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 pl-10 sm:pl-0">
        <a
          href={`https://www.${platform}.com/`}
          target="_blank"
          rel="noreferrer"
          className={cn(
            'inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted transition-colors hover:bg-elevated hover:text-fg',
          )}
        >
          Open
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
        {status?.enabled ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDisable}
            loading={busy}
            icon={<ShieldOff className="size-3.5" aria-hidden="true" />}
          >
            Revoke
          </Button>
        ) : (
          <Button size="sm" onClick={handleEnable} loading={busy}>
            Enable
          </Button>
        )}
      </div>
    </div>
  );
}

export function SiteAccessList() {
  return (
    <div className="divide-y divide-border">
      {PLATFORM_IDS.map((platform) => (
        <SiteRow key={platform} platform={platform} />
      ))}
    </div>
  );
}
