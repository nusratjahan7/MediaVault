import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MediaItem } from '@/types/media';

export interface SelectionController {
  selectedIds: Set<string>;
  selectedItems: MediaItem[];
  selectableCount: number;
  allSelected: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAll: () => void;
  clear: () => void;
}

export function useSelection(items: MediaItem[]): SelectionController {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const selectableIds = useMemo(
    () => items.filter((item) => item.downloadable).map((item) => item.id),
    [items],
  );

  useEffect(() => {
    const validIds = new Set(selectableIds);

    setSelectedIds((previous) => {
      let changed = false;
      const next = new Set<string>();

      for (const id of previous) {
        if (validIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [selectableIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(selectableIds));
  }, [selectableIds]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedItems = useMemo(
    () => items.filter((item) => item.downloadable && selectedIds.has(item.id)),
    [items, selectedIds],
  );

  return {
    selectedIds,
    selectedItems,
    selectableCount: selectableIds.length,
    allSelected: selectableIds.length > 0 && selectedIds.size === selectableIds.length,
    isSelected: (id) => selectedIds.has(id),
    toggle,
    selectAll,
    clear,
  };
}
