import { useState } from 'react';
import {
  Download,
  ExternalLink,
  Image as ImageIcon,
  ImageDown,
  Layers,
} from 'lucide-react';
import type { HighlightMedia } from '@/types/story';
import { cn } from '@/utils/cn';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PlatformBadge } from '../media/PlatformBadge';

export interface HighlightCardProps {
  highlight: HighlightMedia;
  itemsBusy: boolean;
  coverBusy: boolean;
  onDownloadItems: (highlight: HighlightMedia) => void;
  onDownloadCover: (highlight: HighlightMedia) => void;
}

export function HighlightCard({
  highlight,
  itemsBusy,
  coverBusy,
  onDownloadItems,
  onDownloadCover,
}: HighlightCardProps) {
  const [coverFailed, setCoverFailed] = useState(false);
  const coverUrl = highlight.cover?.url ?? highlight.cover?.thumbnailUrl;
  const downloadable = highlight.items.filter((item) => item.downloadable);
  const account = highlight.account?.username ?? highlight.account?.displayName;

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-elevated">
        {coverUrl && !coverFailed ? (
          <img
            src={coverUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <ImageIcon className="size-6" aria-hidden="true" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge tone={highlight.available ? 'accent' : 'warning'}>
            {highlight.available ? `${downloadable.length} media` : 'Unavailable'}
          </Badge>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-fg">
              {highlight.title}
            </p>
            <p className="truncate text-[11px] text-muted">
              {account ? `@${account.replace(/^@/, '')}` : 'Unknown account'}
            </p>
          </div>
          <PlatformBadge platform={highlight.platform} showLabel={false} />
        </div>

        {highlight.unavailableReason && (
          <p
            className={cn(
              'mt-1.5 text-[10px] leading-relaxed',
              highlight.items.length === 0 ? 'text-muted' : 'text-warning',
            )}
          >
            {highlight.unavailableReason}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={itemsBusy}
            disabled={downloadable.length === 0}
            onClick={() => onDownloadItems(highlight)}
            icon={<Download className="size-3.5" aria-hidden="true" />}
          >
            Save highlight
          </Button>
          {highlight.cover && (
            <Button
              variant="secondary"
              size="sm"
              loading={coverBusy}
              onClick={() => onDownloadCover(highlight)}
              icon={<ImageDown className="size-3.5" aria-hidden="true" />}
            >
              Save cover
            </Button>
          )}
          <a
            href={highlight.sourcePageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted transition-colors hover:bg-elevated hover:text-fg"
          >
            <Layers className="size-3.5" aria-hidden="true" />
            Open
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </Card>
  );
}
