import { createContext, useContext } from 'react';
import type { Settings } from '@/types/settings';

export interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  error: string | null;
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>;
  resetSettings: () => Promise<Settings>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider.');
  }

  return context;
}
