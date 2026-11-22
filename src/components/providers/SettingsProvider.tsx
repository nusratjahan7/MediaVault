import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SettingsContext } from '@/hooks/useSettings';
import {
  DEFAULT_SETTINGS,
  getSettings,
  resetSettings as resetStoredSettings,
  saveSettings,
  subscribeToSettings,
} from '@/storage/settings';
import type { Settings } from '@/types/settings';
import { getErrorMessage } from '@/utils/errors';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeToSettings((next) => {
      if (active) {
        setSettings(next);
      }
    });

    getSettings()
      .then((next) => {
        if (active) {
          setSettings(next);
          setLoading(false);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(getErrorMessage(caught));
          setLoading(false);
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    setError(null);
    const next = await saveSettings(patch);
    setSettings(next);
    return next;
  }, []);

  const resetSettings = useCallback(async () => {
    setError(null);
    const next = await resetStoredSettings();
    setSettings(next);
    return next;
  }, []);

  const value = useMemo(
    () => ({ settings, loading, error, updateSettings, resetSettings }),
    [settings, loading, error, updateSettings, resetSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
