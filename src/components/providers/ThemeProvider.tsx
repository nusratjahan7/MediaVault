import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext } from '@/hooks/useTheme';
import { useSettings } from '@/hooks/useSettings';
import type { ThemePreference } from '@/types/settings';

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const setTheme = useCallback(
    async (theme: ThemePreference) => {
      await updateSettings({ theme });
    },
    [updateSettings],
  );

  const value = useMemo(
    () => ({ resolvedTheme, preference: settings.theme, setTheme }),
    [resolvedTheme, settings.theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
