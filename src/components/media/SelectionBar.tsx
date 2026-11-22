import { Download } from 'lucide-react';
import { Button } from '../ui/Button';

export interface SelectionBarProps {
  selectedCount: number;
  selectableCount: number;
  allSelected: boolean;
  busy: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onDownload: () => void;
}

export function SelectionBar({
  selectedCount,
  selectableCount,
  allSelected,
  busy,
  onSelectAll,
  onClear,
  onDownload,
}: SelectionBarProps) {
  return (
    <div className="sticky bottom-0 z-10 mt-3 border-t border-border bg-surface/95 px-3 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={allSelected ? onClear : onSelectAll}
          disabled={selectableCount === 0}
          className="text-xs font-medium text-muted transition-colors hover:text-fg disabled:opacity-50"
        >
          {allSelected ? 'Clear selection' : `Select all ${selectableCount || ''}`.trim()}
        </button>
        <span className="text-xs text-muted">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
      </div>
      <Button
        block
        className="mt-2"
        disabled={selectedCount === 0}
        loading={busy}
        onClick={onDownload}
        icon={<Download className="size-4" aria-hidden="true" />}
      >
        {selectedCount > 0 ? `Download ${selectedCount}` : 'Download'}
      </Button>
    </div>
  );
}
