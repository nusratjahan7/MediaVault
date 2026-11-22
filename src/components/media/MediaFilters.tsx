import { Image as ImageIcon, LayoutGrid, Play } from 'lucide-react';
import { SegmentedControl, type SegmentedOption } from '../ui/SegmentedControl';

export type MediaFilter = 'all' | 'image' | 'video';

export interface MediaFiltersProps {
  value: MediaFilter;
  onChange: (value: MediaFilter) => void;
  counts: { all: number; image: number; video: number };
}

export function MediaFilters({ value, onChange, counts }: MediaFiltersProps) {
  const options: SegmentedOption<MediaFilter>[] = [
    {
      value: 'all',
      label: `All ${counts.all}`,
      icon: <LayoutGrid className="size-3" aria-hidden="true" />,
    },
    {
      value: 'image',
      label: `Photos ${counts.image}`,
      icon: <ImageIcon className="size-3" aria-hidden="true" />,
    },
    {
      value: 'video',
      label: `Videos ${counts.video}`,
      icon: <Play className="size-3" aria-hidden="true" />,
    },
  ];

  return (
    <SegmentedControl
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel="Filter media by type"
      className="w-full"
    />
  );
}
