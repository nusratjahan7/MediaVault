import { useEffect, useState } from 'react';
import { Check, LockKeyhole } from 'lucide-react';
import { PLATFORM_META } from '@/constants';
import {
  getSiteStatuses,
  hasMediaProcessingAccess,
} from '@/services/permissions';
import type { SiteStatus } from '@/types/platform';
import { Badge } from '../ui/Badge';

const PERMISSION_ROWS = [
  {
    name: 'storage',
    purpose: 'Local settings, download history, saved lists, and per-tab selection.',
  },
  {
    name: 'downloads',
    purpose: 'Save media through Chrome and show browser-confirmed progress.',
  },
  {
    name: 'scripting + activeTab',
    purpose: 'Read the page only after you explicitly enable that site and open the popup.',
  },
  {
    name: 'sidePanel',
    purpose: 'Display the local library and queue in Chrome’s side panel.',
  },
  {
    name: 'Optional host access',
    purpose:
      'Per-platform page access, plus media-CDN access only when you request local image conversion.',
  },
];

export function PermissionOverview() {
  const [sites, setSites] = useState<SiteStatus[]>([]);
  const [mediaAccess, setMediaAccess] = useState(false);

  useEffect(() => {
    let active = true;

    void Promise.allSettled([getSiteStatuses(), hasMediaProcessingAccess()]).then(
      ([sitesResult, mediaResult]) => {
        if (!active) {
          return;
        }
        setSites(sitesResult.status === 'fulfilled' ? sitesResult.value : []);
        setMediaAccess(mediaResult.status === 'fulfilled' ? mediaResult.value : false);
      },
    );

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="rounded-md border border-border bg-bg p-3">
      <div className="flex items-center gap-1.5">
        <LockKeyhole className="size-3.5 text-muted" aria-hidden="true" />
        <p className="text-xs font-medium text-fg">Permission overview</p>
      </div>
      <div className="mt-2 space-y-2">
        {PERMISSION_ROWS.map((row) => (
          <div key={row.name} className="flex items-start gap-2">
            <Check className="mt-0.5 size-3 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-[11px] font-medium text-fg">{row.name}</p>
              <p className="text-[10px] leading-relaxed text-muted">{row.purpose}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
          Current access
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {sites.map((site) => (
            <Badge
              key={site.platform}
              tone={site.enabled ? 'success' : 'neutral'}
            >
              {PLATFORM_META[site.platform].label}: {site.enabled ? 'enabled' : 'off'}
            </Badge>
          ))}
          <Badge tone={mediaAccess ? 'success' : 'neutral'}>
            Media conversion: {mediaAccess ? 'allowed' : 'off'}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
          <a href="#sites" className="font-medium text-accent hover:underline">
            Manage site access
          </a>
          <a href="#formats" className="font-medium text-accent hover:underline">
            Manage media processing
          </a>
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted">
        MediaVault does not request cookies, webRequest, tabs, browser history, management, or
        password permissions. Site access is optional and revocable.
      </p>
    </div>
  );
}
