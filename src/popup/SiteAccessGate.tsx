import { Check, LockKeyhole, ShieldCheck } from 'lucide-react';
import { PLATFORM_META } from '@/constants';
import type { PlatformId } from '@/types/platform';
import { Button } from '@/components/ui/Button';

export interface SiteAccessGateProps {
  platform: PlatformId;
  busy: boolean;
  error: string | null;
  onEnable: () => void;
}

const ASSURANCES = [
  'No access until you allow it',
  'Never reads passwords, cookies, or messages',
  'Nothing leaves this device',
  'Revoke anytime in settings',
];

export function SiteAccessGate({ platform, busy, error, onEnable }: SiteAccessGateProps) {
  const meta = PLATFORM_META[platform];

  return (
    <div className="animate-rise space-y-3 p-4">
      <div className="rounded-lg border border-border bg-surface p-4 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </div>
        <h2 className="mt-3 text-base font-semibold tracking-tight text-fg">
          Enable MediaVault on {meta.label}
        </h2>
        <p className="mx-auto mt-1.5 max-w-[34ch] text-xs leading-relaxed text-muted">
          MediaVault needs one-time permission to read media that is already visible on your{' '}
          {meta.label} page.
        </p>

        <Button
          block
          className="mt-4"
          loading={busy}
          onClick={onEnable}
          icon={<ShieldCheck className="size-4" aria-hidden="true" />}
        >
          Enable on this site
        </Button>

        {error && (
          <p role="alert" className="mt-3 text-xs leading-relaxed text-danger">
            {error}
          </p>
        )}

        <ul className="mt-4 space-y-1.5 text-left">
          {ASSURANCES.map((assurance) => (
            <li key={assurance} className="flex items-start gap-2 text-[11px] text-muted">
              <Check className="mt-0.5 size-3 shrink-0 text-success" aria-hidden="true" />
              {assurance}
            </li>
          ))}
        </ul>
      </div>

      <p className="px-2 text-center text-[10px] leading-relaxed text-muted">
        Chrome will ask you to confirm access. Only {meta.label} is affected, and only after you
        approve it.
      </p>
    </div>
  );
}
