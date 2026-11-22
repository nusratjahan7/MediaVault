import { useRef, useState } from 'react';
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';
import { sendToBackground } from '@/services/messaging';
import { coerceSettings, DEFAULT_SETTINGS } from '@/storage/settings';
import { fromErrorPayload, getErrorMessage } from '@/utils/errors';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type ConfirmAction = 'history' | 'all' | null;

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

  const clearEverything = async () => {
    setWorking(true);

    try {
      await sendToBackground({ type: 'HISTORY_CLEAR' }).catch(() => undefined);
      await resetSettings();
      toast({
        title: 'Local data cleared',
        description: 'History and settings were reset on this device.',
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
      const parsed: unknown = JSON.parse(await file.text());
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
        open={confirmAction === 'all'}
        onClose={() => setConfirmAction(null)}
        title="Reset all local data?"
        description="This clears history and restores default settings (theme, download folder, filename template, history limits). Site access is managed separately. Files already downloaded stay on disk."
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
