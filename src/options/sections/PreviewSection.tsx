import { useState } from 'react';
import { History, Sparkles, Users } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';
import { openExtensionPage } from '@/services/navigation';
import { getErrorMessage } from '@/utils/errors';

export function PreviewSection() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const toggleDemo = async (enabled: boolean) => {
    setSaving(true);

    try {
      await updateSettings({ demoMode: enabled });
      toast({
        title: enabled ? 'UI preview enabled' : 'UI preview disabled',
        description: enabled
          ? 'Sample accounts, media, history, and queue data are now shown. Downloads are simulated.'
          : 'MediaVault is using live page scanning and your local history again.',
        variant: 'success',
      });
    } catch (caught) {
      toast({
        title: 'Could not update preview mode',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      id="preview"
      title="Interface preview"
      description="Explore every screen with sample data. The preview layer is separate from production services and never triggers a real download."
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-fg">Demo data mode</p>
              {settings.demoMode ? (
                <Badge tone="accent">
                  <Sparkles className="size-2.5" aria-hidden="true" />
                  Active
                </Badge>
              ) : (
                <Badge tone="neutral">Off</Badge>
              )}
            </div>
            <p className="mt-0.5 max-w-[60ch] text-[11px] leading-relaxed text-muted">
              Shows sample Instagram, Facebook, and TikTok media, accounts, queue activity, and
              history. Download actions are simulated and write nothing to disk.
            </p>
          </div>
          <Toggle
            checked={settings.demoMode}
            onChange={(checked) => {
              void toggleDemo(checked);
            }}
            label="Demo data mode"
            disabled={saving}
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openExtensionPage('history.html')}
            icon={<History className="size-3.5" aria-hidden="true" />}
          >
            Open history page
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => openExtensionPage('accounts.html')}
            icon={<Users className="size-3.5" aria-hidden="true" />}
          >
            Open account selection
          </Button>
        </div>

        <div className="rounded-md border border-border bg-bg p-3">
          <p className="text-[11px] leading-relaxed text-muted">
            Mock content lives in <code className="text-fg">src/mocks/</code>. Production
            scanning, storage, permissions, and downloads remain in{' '}
            <code className="text-fg">src/services/</code>,{' '}
            <code className="text-fg">src/storage/</code>, and{' '}
            <code className="text-fg">src/background/</code>. Turning demo mode off restores the
            live surfaces without changing any saved data.
          </p>
        </div>
      </div>
    </Section>
  );
}
