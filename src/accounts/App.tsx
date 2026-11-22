import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { SavedListsPanel } from '@/components/lists/SavedListsPanel';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { PreviewAccountsView } from './PreviewAccountsView';

type AccountsView = 'saved' | 'preview';

export function App() {
  const { settings } = useSettings();
  const { resolvedTheme, setTheme } = useTheme();
  const [view, setView] = useState<AccountsView>('saved');

  return (
    <PageShell
      active="accounts"
      title="Accounts & lists"
      description="Manage saved profiles locally, preview account context, and start a manual profile workflow. Lists never include credentials or session data."
      actions={
        <>
          {settings.demoMode && <Badge tone="accent">Demo data</Badge>}
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
        </>
      }
    >
      <div className="flex justify-center">
        <SegmentedControl
          value={view}
          options={[
            { value: 'saved', label: 'Saved lists' },
            { value: 'preview', label: 'Interface preview' },
          ]}
          onChange={setView}
          ariaLabel="Accounts page view"
          className="w-full sm:w-auto"
        />
      </div>

      {view === 'saved' ? <SavedListsPanel /> : <PreviewAccountsView />}
    </PageShell>
  );
}
