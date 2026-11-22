import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MediaItem } from '@/types/media';

export interface SelectionController {
  selectedIds: Set<string>;
  selectedItems: MediaItem[];
  selectedCount: number;
  selectableCount: number;
  allSelected: boolean;
  isSelected: (id: string) => boolean;
  toggle: (item: MediaItem) => void;
  selectAll: () => void;
  clear: () => void;
  remove: (id: string) => void;
  restore: (items: MediaItem[]) => void;
}

export function useSelection(items: MediaItem[]): SelectionController {
  const [selected, setSelected] = useState<Map<string, MediaItem>>(
    () => new Map(),
  );

  const selectableItems = useMemo(
    () => items.filter((item) => item.downloadable),
    [items],
  );

  // Refresh metadata for selected items that are still present on the page.
  useEffect(() => {
    setSelected((previous) => {
      if (previous.size === 0) {
        return previous;
      }

      let changed = false;
      const next = new Map(previous);

      for (const item of items) {
        const existing = next.get(item.id);
        if (!existing) {
          continue;
        }

        if (!item.downloadable) {
          next.delete(item.id);
          changed = true;
          continue;
        }

        if (
          existing.url !== item.url ||
          existing.thumbnailUrl !== item.thumbnailUrl ||
          existing.author !== item.author ||
          existing.postUrl !== item.postUrl
        ) {
          next.set(item.id, item);
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [items]);

  const toggle = useCallback((item: MediaItem) => {
    if (!item.downloadable) {
      return;
    }

    setSelected((previous) => {
      const next = new Map(previous);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, item);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected((previous) => {
      const next = new Map(previous);
      for (const item of selectableItems) {
        next.set(item.id, item);
      }
      return next;
    });
  }, [selectableItems]);

  const clear = useCallback(() => {
    setSelected(new Map());
  }, []);

  const remove = useCallback((id: string) => {
    setSelected((previous) => {
      if (!previous.has(id)) {
        return previous;
      }
      const next = new Map(previous);
      next.delete(id);
      return next;
    });
  }, []);

  const restore = useCallback((restored: MediaItem[]) => {
    setSelected(
      new Map(
        restored
          .filter((item) => item.downloadable)
          .map((item) => [item.id, item]),
      ),
    );
  }, []);

  const selectedItems = useMemo(() => [...selected.values()], [selected]);
  const selectedIds = useMemo(() => new Set(selected.keys()), [selected]);
  const allSelected =
    selectableItems.length > 0 &&
    selectableItems.every((item) => selected.has(item.id));

  return {
    selectedIds,
    selectedItems,
    selectedCount: selected.size,
    selectableCount: selectableItems.length,
    allSelected,
    isSelected: (id) => selected.has(id),
    toggle,
    selectAll,
    clear,
    remove,
    restore,
  };
}
