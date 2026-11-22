import { Info } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { APP_VERSION, PLATFORM_IDS, PLATFORM_META } from '@/constants';
import { PlatformBadge } from '@/components/media/PlatformBadge';

const LIMITATIONS = [
  'Media is extracted from rendered pages and public embedded page data — there are no official download APIs.',
  'Private accounts, login walls, age gates, and region restrictions are not supported by design.',
  'Videos delivered as adaptive streams (blob/MSE) have no direct file link and cannot be saved.',
  'Signed media URLs expire. Download while the page is open; rescan if a link stops working.',
  'Carousels and slideshows include only slides the platform has rendered on the current page.',
  'Bulk profile and feed crawling is intentionally not implemented.',
  'Chrome 116+ on desktop is required. Firefox and Safari are not supported.',
];

export function AboutSection() {
  return (
    <Section
      id="about"
      title={`About MediaVault ${APP_VERSION}`}
      description="A focused, local-first downloader for media you are authorized to access."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {PLATFORM_IDS.map((platform) => (
            <div
              key={platform}
              className="rounded-md border border-border bg-bg px-2.5 py-1.5"
            >
              <PlatformBadge platform={platform} />
              <p className="mt-0.5 text-[10px] text-muted">{PLATFORM_META[platform].description}</p>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-warning/25 bg-warning/5 p-3">
          <div className="flex items-center gap-1.5 text-warning">
            <Info className="size-3.5" aria-hidden="true" />
            <p className="text-xs font-medium">Known limitations</p>
          </div>
          <ul className="mt-2 space-y-1.5">
            {LIMITATIONS.map((limitation) => (
              <li
                key={limitation}
                className="flex gap-2 text-[11px] leading-relaxed text-muted"
              >
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-warning/60" />
                {limitation}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[10px] leading-relaxed text-muted">
          Only download media you have permission to save. MediaVault does not strip watermarks,
          bypass DRM, or defeat platform access controls.
        </p>
      </div>
    </Section>
  );
}
