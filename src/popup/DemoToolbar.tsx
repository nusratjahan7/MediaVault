import { X } from 'lucide-react';
import { PLATFORM_IDS, PLATFORM_META } from '@/constants';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { PlatformId } from '@/types/platform';

export interface DemoToolbarProps {
  platform: PlatformId;
  onPlatformChange: (platform: PlatformId) => void;
  onExit: () => void;
}

export function DemoToolbar({ platform, onPlatformChange, onExit }: DemoToolbarProps) {
  return (
    <div className="space-y-2 border-b border-border bg-accent/[0.03] p-3">
      <div className="flex items-start gap-2">
        <DemoBanner compact className="flex-1" />
        <button
          type="button"
          onClick={onExit}
          className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-muted transition-colors hover:bg-elevated hover:text-fg"
        >
          <X className="size-3" aria-hidden="true" />
          Exit
        </button>
      </div>

      <SegmentedControl
        value={platform}
        options={PLATFORM_IDS.map((id) => ({
          value: id,
          label: PLATFORM_META[id].label,
        }))}
        onChange={onPlatformChange}
        ariaLabel="Preview platform"
        className="w-full"
      />
    </div>
  );
}
