import { Search } from 'lucide-react';
import { PLATFORM_IDS, PLATFORM_META } from '@/constants';
import type { HistoryFilters as HistoryFilterValues } from '@/hooks/useHistory';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

export interface HistoryFiltersProps {
  filters: HistoryFilterValues;
  onChange: (patch: Partial<HistoryFilterValues>) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'downloading', label: 'Downloading' },
  { value: 'queued', label: 'Queued' },
  { value: 'failed', label: 'Failed' },
  { value: 'interrupted', label: 'Interrupted' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

export function HistoryFilters({ filters, onChange }: HistoryFiltersProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <Input
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
          placeholder="Search downloads"
          aria-label="Search downloads"
          className="pl-8"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={filters.platform}
          onChange={(event) =>
            onChange({ platform: event.target.value as HistoryFilterValues['platform'] })
          }
          aria-label="Filter by platform"
        >
          <option value="all">All platforms</option>
          {PLATFORM_IDS.map((platform) => (
            <option key={platform} value={platform}>
              {PLATFORM_META[platform].label}
            </option>
          ))}
        </Select>
        <Select
          value={filters.status}
          onChange={(event) =>
            onChange({ status: event.target.value as HistoryFilterValues['status'] })
          }
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
