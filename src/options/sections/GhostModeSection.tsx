import { ExternalLink, Ghost, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Badge } from '@/components/ui/Badge';

const OFFICIAL_PRIVACY_LINKS = [
  {
    platform: 'Instagram',
    href: 'https://www.instagram.com/accounts/privacy_and_security/',
  },
  {
    platform: 'Facebook',
    href: 'https://www.facebook.com/settings?tab=privacy',
  },
  {
    platform: 'TikTok',
    href: 'https://www.tiktok.com/setting/privacy',
  },
];

export function GhostModeSection() {
  return (
    <Section
      id="ghost-mode"
      title="Ghost Mode"
      description="Local trace reduction only. Ghost Mode is not anonymity and does not conceal your identity or viewing activity."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning">
            <ShieldAlert className="size-2.5" aria-hidden="true" />
            No anonymity guarantee
          </Badge>
          <Badge tone="neutral">
            <Ghost className="size-2.5" aria-hidden="true" />
            Local-only app
          </Badge>
        </div>

        <div className="rounded-md border border-warning/25 bg-warning/5 p-3">
          <p className="text-xs font-semibold text-fg">What Ghost Mode does not do</p>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
            <li>• It does not hide story views or interfere with view tracking.</li>
            <li>• It does not hide DM read receipts or access private messages.</li>
            <li>• It does not bypass authentication, privacy controls, or rate limits.</li>
            <li>• It does not claim that you are anonymous when the platform can still see you.</li>
          </ul>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-border bg-bg p-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium text-fg">Local trace controls</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Use Privacy & data to clear history, saved account lists, or all local extension
              data, and to turn off local download history. MediaVault has no server, analytics,
              or remote account to delete.
            </p>
            <a
              href="#privacy"
              className="mt-1.5 inline-flex text-[11px] font-medium text-accent hover:underline"
            >
              Open local data controls
            </a>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-fg">Official platform privacy settings</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            Only the platform can change who sees your activity. Use its official settings:
            MediaVault cannot guarantee a supported anonymous-viewing feature.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OFFICIAL_PRIVACY_LINKS.map((link) => (
              <a
                key={link.platform}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 text-xs font-medium text-fg transition-colors hover:bg-surface"
              >
                {link.platform} privacy
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <p className="text-[10px] leading-relaxed text-muted">
          Platform view tracking and official anonymous-viewing availability are controlled by
          the platform, not MediaVault. No workaround is implemented.
        </p>
      </div>
    </Section>
  );
}
