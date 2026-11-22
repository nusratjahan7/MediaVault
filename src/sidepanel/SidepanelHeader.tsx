import { History, Moon, Settings, Sun } from 'lucide-react';
import { BrandMark } from '@/components/layout/BrandMark';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { pluralize } from '@/utils/format';

export interface SidepanelHeaderProps {
  total: number;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export function SidepanelHeader({
  total,
  onOpenSettings,
  onOpenHistory,
}: SidepanelHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-surface/90 px-3 py-2.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2">
        <BrandMark className="size-7" />
        <div className="min-w-0">
          <p className="text-sm leading-tight font-semibold tracking-tight text-fg">Library</p>
          <p className="truncate text-[10px] leading-tight text-muted">
            {total} {pluralize(total, 'local entry', 'local entries')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <IconButton
          label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => {
            void setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
          }}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="size-4" aria-hidden="true" />
          ) : (
            <Moon className="size-4" aria-hidden="true" />
          )}
        </IconButton>
        <IconButton label="Open full history" onClick={onOpenHistory}>
          <History className="size-4" aria-hidden="true" />
        </IconButton>
        <IconButton label="Open settings" onClick={onOpenSettings}>
          <Settings className="size-4" aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}
