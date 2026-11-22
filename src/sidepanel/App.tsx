import { useHistory } from '@/hooks/useHistory';
import { useSettings } from '@/hooks/useSettings';
import { LibraryView } from './LibraryView';
import { SidepanelHeader } from './SidepanelHeader';

export function App() {
  const history = useHistory();
  const { settings } = useSettings();

  const openSettings = () => {
    void chrome.runtime.openOptionsPage();
  };

  return (
    <div className="min-h-screen bg-bg">
      <SidepanelHeader total={history.total} onOpenSettings={openSettings} />
      <main className="mv-scrollbar">
        <LibraryView
          history={history}
          historyEnabled={settings.historyEnabled}
          onOpenSettings={openSettings}
        />
      </main>
    </div>
  );
}
