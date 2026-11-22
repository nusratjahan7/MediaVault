import { useState } from 'react';
import {
  Clock3,
  Download,
  Image as ImageIcon,
  Play,
} from 'lucide-react';
import type { StoryMedia } from '@/types/story';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/format';
import { formatStoryExpiration } from '@/utils/story';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PlatformBadge } from '../media/PlatformBadge';

export interface StoryCardProps {
  story: StoryMedia;
  busy: boolean;
  onDownload: (story: StoryMedia) => void;
}

export function StoryCard({ story, busy, onDownload }: StoryCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const thumbnail = story.item.thumbnailUrl;
  const statusTone = story.expired
    ? 'danger'
    : story.available
      ? 'success'
      : 'warning';
  const statusLabel = story.expired
    ? 'Expired'
    : story.available
      ? 'Available'
      : 'Unavailable';
  const account = story.account?.username ?? story.account?.displayName;

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-elevated">
          {thumbnail && !imageFailed ? (
            <img
              src={thumbnail}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
              className={cn(
                'h-full w-full object-cover',
                !story.available && 'opacity-50 grayscale',
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted">
              {story.item.kind === 'video' ? (
                <Play className="size-4" aria-hidden="true" />
              ) : (
                <ImageIcon className="size-4" aria-hidden="true" />
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-fg">
                {account ? `@${account.replace(/^@/, '')}` : 'Unknown account'}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <PlatformBadge platform={story.platform} />
                <Badge tone="neutral">{story.item.kind}</Badge>
                <Badge tone={statusTone}>{statusLabel}</Badge>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted">
              <Clock3 className="size-3" aria-hidden="true" />
              {formatStoryExpiration(story.expiresAt)}
            </span>
          </div>

          {story.postedAt && (
            <p className="mt-1 text-[10px] text-muted">
              Posted {formatRelativeTime(story.postedAt)}
            </p>
          )}

          {story.unavailableReason && (
            <p className="mt-1 text-[10px] leading-relaxed text-warning">
              {story.unavailableReason}
            </p>
          )}
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        block
        className="mt-3"
        loading={busy}
        disabled={!story.available}
        onClick={() => onDownload(story)}
        icon={<Download className="size-3.5" aria-hidden="true" />}
      >
        {story.available ? 'Save story' : 'Not available'}
      </Button>
    </Card>
  );
}
