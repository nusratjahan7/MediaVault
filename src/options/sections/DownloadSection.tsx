import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { FilenameTemplateField } from '@/components/settings/FilenameTemplateField';
import { FolderOrganizationFields } from '@/components/settings/FolderOrganizationFields';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_FILENAME_TEMPLATES } from '@/storage/settings';
import { getErrorMessage } from '@/utils/errors';
import { sanitizeSubfolder } from '@/utils/filename';

export function DownloadSection() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [subfolder, setSubfolder] = useState(settings.downloadSubfolder);
  const [template, setTemplate] = useState(settings.filenameTemplate);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    settings.selectedFilenameTemplateId ?? '',
  );
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    setSubfolder(settings.downloadSubfolder);
    setTemplate(settings.filenameTemplate);
    setSelectedTemplateId(settings.selectedFilenameTemplateId ?? '');
  }, [
    settings.downloadSubfolder,
    settings.filenameTemplate,
    settings.selectedFilenameTemplateId,
  ]);

  const dirty =
    subfolder !== settings.downloadSubfolder ||
    template !== settings.filenameTemplate ||
    selectedTemplateId !== (settings.selectedFilenameTemplateId ?? '');
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
        selectedFilenameTemplateId: selectedTemplateId || undefined,
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

  const selectTemplate = (id: string) => {
    setSelectedTemplateId(id);

    if (!id) {
      return;
    }

    const selected = settings.filenameTemplates.find((entry) => entry.id === id);
    if (selected) {
      setTemplate(selected.template);
    }
  };

  const saveTemplate = async () => {
    if (!template.trim()) {
      toast({
        title: 'Template is empty',
        description: 'Add at least one filename variable before saving.',
        variant: 'error',
      });
      return;
    }

    if (settings.filenameTemplates.length >= 20) {
      toast({
        title: 'Template limit reached',
        description: 'MediaVault supports up to 20 saved templates. Reset settings to return to the built-in set.',
        variant: 'error',
      });
      return;
    }

    setSavingTemplate(true);

    try {
      const id = `custom-${Date.now().toString(36)}`;
      const name = (templateName.trim() || 'Custom template').slice(0, 40);
      const next = [
        ...settings.filenameTemplates,
        { id, name, template: template.trim() },
      ];

      await updateSettings({
        filenameTemplates: next,
        filenameTemplate: template.trim(),
        selectedFilenameTemplateId: id,
      });
      setSelectedTemplateId(id);
      setTemplateName('');
      toast({
        title: 'Template saved',
        description: `“${name}” is now the active filename template.`,
        variant: 'success',
      });
    } catch (caught) {
      toast({
        title: 'Could not save template',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const resetTemplate = async () => {
    const fallback =
      settings.filenameTemplates.find((entry) => entry.id === 'default') ??
      DEFAULT_FILENAME_TEMPLATES[0]!;

    setTemplate(fallback.template);
    setSelectedTemplateId(fallback.id);
    setTemplateName('');

    try {
      await updateSettings({
        filenameTemplate: fallback.template,
        selectedFilenameTemplateId: fallback.id,
      });
      toast({ title: 'Filename template reset', variant: 'success' });
    } catch (caught) {
      toast({
        title: 'Could not reset template',
        description: getErrorMessage(caught),
        variant: 'error',
      });
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

        <div className="space-y-3 border-t border-border pt-4">
          <div className="space-y-1.5">
            <label htmlFor="saved-template" className="text-xs font-medium text-fg">
              Saved templates
            </label>
            <Select
              id="saved-template"
              value={selectedTemplateId}
              onChange={(event) => selectTemplate(event.target.value)}
              aria-label="Select a filename template"
            >
              <option value="">Custom template</option>
              {settings.filenameTemplates.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </Select>
          </div>

          <FilenameTemplateField
            value={template}
            subfolder={subfolder}
            organizeByAccount={settings.organizeByAccount}
            organizeByCategory={settings.organizeByCategory}
            splitByMediaType={settings.splitByMediaType}
            onChange={(next) => {
              setTemplate(next);
              setSelectedTemplateId('');
            }}
            onBlur={() => {
              if (!template.trim()) {
                setTemplate(settings.filenameTemplate);
                setSelectedTemplateId(settings.selectedFilenameTemplateId ?? '');
              }
            }}
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="Template name"
              maxLength={40}
              aria-label="New template name"
            />
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
              loading={savingTemplate}
              onClick={() => void saveTemplate()}
              icon={<Save className="size-3.5" aria-hidden="true" />}
            >
              Save as template
            </Button>
          </div>
        </div>

        <FolderOrganizationFields />

        <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg">Ask where to save each file</p>
            <p className="mt-0.5 max-w-[60ch] text-[11px] leading-relaxed text-muted">
              Uses Chrome’s native Save As dialog so you can choose the destination folder for
              every download. Chrome’s Downloads API does not allow extensions to persist an
              arbitrary absolute folder, so this is the supported way to select a different
              location. When off, Chrome saves under your default download folder using the
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

        <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg">Skip Downloaded</p>
            <p className="mt-0.5 max-w-[60ch] text-[11px] leading-relaxed text-muted">
              When media with the same identity already has a completed download in local
              history, do not add it to the queue again. Turn this off to intentionally download
              another copy.
            </p>
          </div>
          <Toggle
            checked={settings.skipDownloaded}
            onChange={(checked) => {
              void updateSettings({ skipDownloaded: checked });
            }}
            label="Skip already downloaded media"
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-fg">Parallel downloads</p>
            <p className="mt-0.5 max-w-[60ch] text-[11px] leading-relaxed text-muted">
              Maximum downloads started at once. MediaVault caps this at three to respect
              Chrome and platform resource limits.
            </p>
          </div>
          <Select
            value={String(settings.downloadConcurrency)}
            onChange={(event) => {
              void updateSettings({ downloadConcurrency: Number(event.target.value) });
            }}
            aria-label="Maximum parallel downloads"
            wrapperClassName="w-full sm:w-32"
          >
            <option value="1">1 at a time</option>
            <option value="2">2 at a time</option>
            <option value="3">3 at a time</option>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void save()} disabled={!dirty} loading={saving}>
            Save changes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void resetTemplate()}
            icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
          >
            Reset to default
          </Button>
        </div>
      </div>
    </Section>
  );
}
