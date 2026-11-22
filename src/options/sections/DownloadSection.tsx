import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { FilenameTemplateField } from '@/components/settings/FilenameTemplateField';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_SETTINGS } from '@/storage/settings';
import { getErrorMessage } from '@/utils/errors';
import { sanitizeSubfolder } from '@/utils/filename';

export function DownloadSection() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [subfolder, setSubfolder] = useState(settings.downloadSubfolder);
  const [template, setTemplate] = useState(settings.filenameTemplate);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSubfolder(settings.downloadSubfolder);
    setTemplate(settings.filenameTemplate);
  }, [settings.downloadSubfolder, settings.filenameTemplate]);

  const dirty =
    subfolder !== settings.downloadSubfolder || template !== settings.filenameTemplate;
  const subfolderInvalid = subfolder.trim().length === 0;
  const templateInvalid = template.trim().length === 0;

  const save = async () => {
    if (!dirty || saving) {
      return;
    }

    if (subfolderInvalid || templateInvalid) {
      toast({
        title: 'Check your download settings',
        description: 'The folder and filename template cannot be empty.',
        variant: 'error',
      });
      return;
    }

    setSaving(true);

    try {
      await updateSettings({
        downloadSubfolder: sanitizeSubfolder(subfolder),
        filenameTemplate: template.trim(),
      });
      toast({
        title: 'Download settings saved',
        description: 'New downloads will use this folder and filename pattern.',
        variant: 'success',
      });
    } catch (caught) {
      toast({ title: 'Could not save settings', description: getErrorMessage(caught), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      id="downloads"
      title="Downloads"
      description="MediaVault saves files through Chrome's Downloads API. Folders are relative to your default download directory."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="download-subfolder" className="text-xs font-medium text-fg">
            Download folder
          </label>
          <Input
            id="download-subfolder"
            value={subfolder}
            onChange={(event) => setSubfolder(event.target.value)}
            onBlur={() => {
              if (subfolder.trim()) {
                setSubfolder(sanitizeSubfolder(subfolder));
              }
            }}
            placeholder="MediaVault"
            invalid={subfolderInvalid}
            spellCheck={false}
          />
          <p className="text-[11px] leading-relaxed text-muted">
            Defaults to <span className="font-medium text-fg">MediaVault</span>. Each platform
            gets its own subfolder. Absolute paths and <code>..</code> are removed.
          </p>
          {subfolderInvalid && (
            <p className="text-[11px] text-danger">Enter a folder name.</p>
          )}
        </div>

        <FilenameTemplateField
          value={template}
          subfolder={subfolder}
          onChange={setTemplate}
          onBlur={() => {
            if (!template.trim()) {
              setTemplate(settings.filenameTemplate);
            }
          }}
        />

        <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg">Ask where to save each file</p>
            <p className="mt-0.5 max-w-[60ch] text-[11px] leading-relaxed text-muted">
              Uses Chrome’s native Save As dialog so you can choose the destination folder for
              every download. When off, Chrome saves to your default download folder using the
              subfolder above.
            </p>
          </div>
          <Toggle
            checked={settings.askWhereToSave}
            onChange={(checked) => {
              void updateSettings({ askWhereToSave: checked });
            }}
            label="Ask where to save each file"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void save()} disabled={!dirty} loading={saving}>
            Save changes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTemplate(DEFAULT_SETTINGS.filenameTemplate)}
            icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
          >
            Reset template
          </Button>
        </div>
      </div>
    </Section>
  );
}
