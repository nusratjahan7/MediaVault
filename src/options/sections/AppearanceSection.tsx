import { Section } from '@/components/layout/Section';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { useSettings } from '@/hooks/useSettings';
import type { ThemePreference } from '@/types/settings';

export function AppearanceSection() {
  const { settings, updateSettings } = useSettings();

  const handleChange = (theme: ThemePreference) => {
    void updateSettings({ theme });
  };

  return (
    <Section
      id="appearance"
      title="Appearance"
      description="Choose how MediaVault looks. System follows your operating system preference automatically."
    >
      <ThemeSelector value={settings.theme} onChange={handleChange} />
    </Section>
  );
}
