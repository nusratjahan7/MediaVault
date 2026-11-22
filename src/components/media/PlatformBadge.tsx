import { Facebook, Instagram, Music2, type LucideIcon } from 'lucide-react';
import { PLATFORM_META } from '@/constants';
import type { PlatformId } from '@/types/platform';
import { cn } from '@/utils/cn';

const ICONS: Record<PlatformId, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: Music2,
};

export interface PlatformBadgeProps {
  platform: PlatformId;
  showLabel?: boolean;
  className?: string;
}

export function PlatformBadge({
  platform,
  showLabel = true,
  className,
}: PlatformBadgeProps) {
  const Icon = ICONS[platform];

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-muted', className)}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {showLabel && PLATFORM_META[platform].label}
    </span>
  );
}
