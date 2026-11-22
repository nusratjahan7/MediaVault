import { Library, Moon, Settings, Sun } from 'lucide-react';
import { BrandMark } from '@/components/layout/BrandMark';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/hooks/useTheme';

export interface PopupHeaderProps {
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
}

export function PopupHeader({ onOpenLibrary, onOpenSettings }: PopupHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="flex items-center justify-between gap-2 border-b border-border bg-surface/90 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2">
        <BrandMark className="size-7" />
        <div>
          <p className="text-sm leading-tight font-semibold tracking-tight text-fg">MediaVault</p>
          <p className="text-[10px] leading-tight text-muted">Private, local downloads</p>
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
        <IconButton label="Open library" onClick={onOpenLibrary}>
          <Library className="size-4" aria-hidden="true" />
        </IconButton>
        <IconButton label="Open settings" onClick={onOpenSettings}>
          <Settings className="size-4" aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}
