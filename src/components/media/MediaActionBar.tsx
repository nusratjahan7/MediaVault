import { CheckSquare, Download, DownloadCloud, X } from 'lucide-react';
import { Button } from '../ui/Button';

export interface MediaActionBarProps {
  itemCount: number;
  selectionMode: boolean;
  busy: boolean;
  onDownloadCurrent: () => void;
  onBulkDownload: () => void;
  onToggleSelection: () => void;
}

export function MediaActionBar({
  itemCount,
  selectionMode,
  busy,
  onDownloadCurrent,
  onBulkDownload,
  onToggleSelection,
}: MediaActionBarProps) {
  const downloadDisabled = itemCount === 0 || busy;

  return (
    <div className="space-y-2" aria-label="Media actions">
      <Button
        block
        size="sm"
        onClick={onDownloadCurrent}
        disabled={downloadDisabled}
        icon={<Download className="size-3.5" aria-hidden="true" />}
      >
        Download current
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onBulkDownload}
          disabled={downloadDisabled}
          icon={<DownloadCloud className="size-3.5" aria-hidden="true" />}
        >
          Bulk {itemCount > 0 ? `(${itemCount})` : ''}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onToggleSelection}
          disabled={itemCount === 0}
          icon={
            selectionMode ? (
              <X className="size-3.5" aria-hidden="true" />
            ) : (
              <CheckSquare className="size-3.5" aria-hidden="true" />
            )
          }
        >
          {selectionMode ? 'Stop selecting' : 'Start select'}
        </Button>
      </div>
    </div>
  );
}
