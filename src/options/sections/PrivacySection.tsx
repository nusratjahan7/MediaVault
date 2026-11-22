import { ShieldCheck } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { DataManagement } from '@/components/settings/DataManagement';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { useSettings } from '@/hooks/useSettings';

const HISTORY_LIMITS = [100, 250, 500, 1000];

const PRIVACY_POINTS = [
  'No cookies, passwords, authentication tokens, or private messages are read.',
  'No backend, analytics, telemetry, or remote fonts. Nothing is uploaded.',
  'Settings stay in chrome.storage.local and download history stays in IndexedDB.',
  'Private and restricted content is never accessed or bypassed.',
];

export function PrivacySection() {
  const { settings, updateSettings } = useSettings();

  return (
    <Section
      id="privacy"
      title="Privacy & data"
      description="Everything MediaVault stores stays in this browser profile on this device."
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-fg">Save download history</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Keep a local record of downloads so you can find, retry, or remove entries. Turn
              this off to avoid writing history to IndexedDB.
            </p>
          </div>
          <Toggle
            checked={settings.historyEnabled}
            onChange={(checked) => {
              void updateSettings({ historyEnabled: checked });
            }}
            label="Save download history"
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-fg">History limit</p>
            <p className="mt-0.5 text-[11px] text-muted">
              Older entries are removed automatically after a download completes.
            </p>
          </div>
          <Select
            value={String(settings.maxHistoryEntries)}
            onChange={(event) => {
              void updateSettings({ maxHistoryEntries: Number(event.target.value) });
            }}
            disabled={!settings.historyEnabled}
            aria-label="Maximum history entries"
            wrapperClassName="w-full sm:w-32"
          >
            {HISTORY_LIMITS.map((limit) => (
              <option key={limit} value={limit}>
                {limit} entries
              </option>
            ))}
          </Select>
        </div>

        <div className="border-t border-border pt-4">
          <DataManagement />
        </div>

        <div className="rounded-md border border-border bg-bg p-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
            <p className="text-xs font-medium text-fg">Privacy commitments</p>
          </div>
          <ul className="mt-2 space-y-1.5">
            {PRIVACY_POINTS.map((point) => (
              <li key={point} className="flex gap-2 text-[11px] leading-relaxed text-muted">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
