import { CheckCircle2, X } from 'lucide-react';
import type { DownloadProgress } from '@/hooks/useDownloads';
import { ProgressBar } from '../ui/ProgressBar';

export interface DownloadBarProps {
  progress: DownloadProgress;
  onViewLibrary: () => void;
  onDismiss: () => void;
}

export function DownloadBar({ progress, onViewLibrary, onDismiss }: DownloadBarProps) {
  if (progress.total === 0 && !progress.error) {
    return null;
  }

  const done = progress.completed + progress.failed;
  const percent = progress.total > 0 ? (done / progress.total) * 100 : 0;
  const summary = progress.error
    ? progress.error
    : progress.active > 0
      ? `Downloading ${progress.active} of ${progress.total}…`
      : progress.failed > 0
        ? `${progress.completed} saved, ${progress.failed} failed`
        : `${progress.completed} saved`;

  return (
    <div className="animate-rise border-t border-border bg-elevated px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <CheckCircle2
            className={progress.failed > 0 || progress.error ? 'mt-0.5 size-3.5 shrink-0 text-warning' : 'mt-0.5 size-3.5 shrink-0 text-success'}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-fg">{summary}</p>
            <button
              type="button"
              onClick={onViewLibrary}
              className="text-[11px] font-medium text-accent transition-opacity hover:opacity-80"
            >
              View library
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss download status"
          className="rounded p-0.5 text-muted transition-colors hover:text-fg"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      {progress.total > 0 && <ProgressBar value={percent} className="mt-2" />}
    </div>
  );
}
