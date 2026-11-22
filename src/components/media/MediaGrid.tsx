import type { MediaItem } from '@/types/media';
import type { SelectionController } from '@/hooks/useSelection';
import { cn } from '@/utils/cn';
import { MediaCard } from './MediaCard';

export interface MediaGridProps {
  items: MediaItem[];
  selection: SelectionController;
  selectionMode?: boolean;
  className?: string;
}

export function MediaGrid({
  items,
  selection,
  selectionMode = true,
  className,
}: MediaGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2.5', className)}>
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          selected={selection.isSelected(item.id)}
          onToggle={() => selection.toggle(item)}
          selectionMode={selectionMode}
        />
      ))}
    </div>
  );
}
