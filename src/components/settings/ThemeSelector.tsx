import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePreference } from '@/types/settings';
import { SegmentedControl, type SegmentedOption } from '../ui/SegmentedControl';

export interface ThemeSelectorProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

const OPTIONS: SegmentedOption<ThemePreference>[] = [
  {
    value: 'system',
    label: 'System',
    icon: <Monitor className="size-3" aria-hidden="true" />,
  },
  { value: 'light', label: 'Light', icon: <Sun className="size-3" aria-hidden="true" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="size-3" aria-hidden="true" /> },
];

export function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <SegmentedControl
      value={value}
      options={OPTIONS}
      onChange={onChange}
      ariaLabel="Theme preference"
      className="w-full"
    />
  );
}
