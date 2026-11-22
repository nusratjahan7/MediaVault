import { useRef, useState } from 'react';
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { PREVIEW_ACCOUNTS_STORAGE_KEY } from '@/constants';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';
import { sendToBackground } from '@/services/messaging';
import { clearDownloadMemory } from '@/storage/download-memory';
import { clearSavedLists, stopProfileWorkflow } from '@/storage/lists';
import { coerceSettings, DEFAULT_SETTINGS } from '@/storage/settings';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';
import { readFileText } from '@/utils/file';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type ConfirmAction = 'history' | 'lists' | 'settings' | 'all' | null;

export function DataManagement() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [working, setWorking] = useState(false);

  const clearHistory = async () => {
    setWorking(true);

    try {
      const response = await sendToBackground({ type: 'HISTORY_CLEAR' });
      if (!response.ok) {
        throw fromErrorPayload(response.error);
      }

      toast({
        title: 'History cleared',
        description: `${response.data.cleared} ${
          response.data.cleared === 1 ? 'entry' : 'entries'
        } removed from this device.`,
        variant: 'success',
      });
    } catch (caught) {
      toast({ title: 'Could not clear history', description: getErrorMessage(caught), variant: 'error' });
    } finally {
      setWorking(false);
      setConfirmAction(null);
    }
  };

  const clearLists = async () => {
    setWorking(true);

    try {
      await clearSavedLists();
      await stopProfileWorkflow();
      toast({
        title: 'Saved account lists cleared',
        description: 'All local lists and the active profile workflow were removed.',
        variant: 'success',
      });
    } catch (caught) {
      toast({
        title: 'Could not clear saved lists',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      setWorking(false);
      setConfirmAction(null);
    }
  };

  const resetOnlySettings = async () => {
    setWorking(true);

    try {
      await resetSettings();
      toast({
        title: 'Settings reset',
        description: 'All preferences were restored to their defaults.',
        variant: 'success',
      });
    } catch (caught) {
      toast({
        title: 'Could not reset settings',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      setWorking(false);
      setConfirmAction(null);
    }
  };

  const clearEverything = async () => {
    setWorking(true);

    try {
      await sendToBackground({ type: 'HISTORY_CLEAR' }).catch(() => undefined);
      await chrome.storage.local.remove(PREVIEW_ACCOUNTS_STORAGE_KEY).catch(() => undefined);
      await clearSavedLists().catch(() => undefined);
      await clearDownloadMemory().catch(() => undefined);
      await stopProfileWorkflow().catch(() => undefined);
      await chrome.storage.session.clear().catch(() => undefined);
      await resetSettings();
      toast({
        title: 'Local data cleared',
        description:
          'History, saved lists, workflow, selection, settings, and preview selections were reset on this device.',
        variant: 'success',
      });
    } catch (caught) {
      toast({ title: 'Could not clear data', description: getErrorMessage(caught), variant: 'error' });
    } finally {
      setWorking(false);
      setConfirmAction(null);
    }
  };

  const exportSettings = () => {
    const payload = JSON.stringify(
      {
        app: 'MediaVault',
        version: 1,
        exportedAt: new Date().toISOString(),
        settings,
      },
      null,
      2,
    );

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'mediavault-settings.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);

    toast({ title: 'Settings exported', variant: 'success' });
  };

  const importSettings = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await readFileText(file));
      const candidate =
        typeof parsed === 'object' && parsed !== null && 'settings' in parsed
          ? (parsed as { settings: unknown }).settings
          : parsed;
      const next = coerceSettings(candidate);
      await updateSettings(next);
      toast({
        title: 'Settings imported',
        description: 'Your local preferences were updated.',
        variant: 'success',
      });
    } catch (caught) {
      toast({
        title: 'Could not import settings',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={exportSettings}
          icon={<Download className="size-3.5" aria-hidden="true" />}
        >
          Export settings
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          icon={<Upload className="size-3.5" aria-hidden="true" />}
        >
          Import settings
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void importSettings(file);
            }
          }}
        />
      </div>

      <div className="rounded-md border border-danger/25 bg-danger/5 p-3">
        <p className="text-xs font-medium text-fg">Local data</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
          Download history lives in IndexedDB on this device. Clearing it cannot be undone.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmAction('history')}
            icon={<Trash2 className="size-3.5" aria-hidden="true" />}
          >
            Clear history
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmAction('lists')}
            icon={<Trash2 className="size-3.5" aria-hidden="true" />}
          >
            Clear saved lists
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirmAction('settings')}
            icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
          >
            Reset settings
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmAction('all')}
            icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
          >
            Reset everything
          </Button>
        </div>
      </div>

      <Modal
        open={confirmAction === 'history'}
        onClose={() => setConfirmAction(null)}
        title="Clear download history?"
        description="This removes local history entries. Files already downloaded are not deleted."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={clearHistory} loading={working}>
              Clear history
            </Button>
          </>
        }
      />

      <Modal
        open={confirmAction === 'lists'}
        onClose={() => setConfirmAction(null)}
        title="Clear saved account lists?"
        description="This removes all local saved lists, profiles, and the active profile workflow. It does not affect platform accounts or downloaded files."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={clearLists} loading={working}>
              Clear saved lists
            </Button>
          </>
        }
      />

      <Modal
        open={confirmAction === 'settings'}
        onClose={() => setConfirmAction(null)}
        title="Reset settings to defaults?"
        description="This restores preferences only. History, saved lists, downloads, and site access are not changed."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void resetOnlySettings()} loading={working}>
              Reset settings
            </Button>
          </>
        }
      />

      <Modal
        open={confirmAction === 'all'}
        onClose={() => setConfirmAction(null)}
        title="Reset all local data?"
        description="This clears history, saved lists, the active workflow, session selections, and settings. Site access is managed separately. Files already downloaded stay on disk."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmAction(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={clearEverything} loading={working}>
              Reset everything
            </Button>
          </>
        }
      />

      <p className="text-[10px] leading-relaxed text-muted">
        Default settings: {DEFAULT_SETTINGS.downloadSubfolder}/ folder,{' '}
        {DEFAULT_SETTINGS.filenameTemplate} template.
      </p>
    </div>
  );
}
