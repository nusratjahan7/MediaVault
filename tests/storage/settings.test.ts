import { describe, expect, it } from 'vitest';
import { SETTINGS_STORAGE_KEY } from '@/constants';
import {
  DEFAULT_SETTINGS,
  getSettings,
  resetSettings,
  saveSettings,
  subscribeToSettings,
} from '@/storage/settings';
import type { Settings } from '@/types/settings';
import { getStorageValue } from '../mocks/chrome';

describe('settings storage', () => {
  it('returns defaults when nothing is stored', async () => {
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('persists a versioned envelope and coerces invalid values', async () => {
    const saved = await saveSettings({
      theme: 'dark',
      downloadSubfolder: '   ',
      filenameTemplate: '',
      maxHistoryEntries: 99_999,
      autoScan: false,
    });

    expect(saved.theme).toBe('dark');
    expect(saved.downloadSubfolder).toBe(DEFAULT_SETTINGS.downloadSubfolder);
    expect(saved.filenameTemplate).toBe(DEFAULT_SETTINGS.filenameTemplate);
    expect(saved.maxHistoryEntries).toBe(1000);
    expect(saved.autoScan).toBe(false);

    const stored = getStorageValue<{ version: number; data: Settings }>(SETTINGS_STORAGE_KEY);
    expect(stored?.version).toBe(1);
    expect(stored?.data.theme).toBe('dark');
  });

  it('repairs malformed stored values', async () => {
    await chrome.storage.local.set({
      [SETTINGS_STORAGE_KEY]: {
        version: 99,
        data: {
          theme: 'neon',
          historyEnabled: 'yes',
          maxHistoryEntries: -20,
        },
      },
    });

    const settings = await getSettings(true);

    expect(settings.theme).toBe('system');
    expect(settings.historyEnabled).toBe(true);
    expect(settings.maxHistoryEntries).toBe(50);
  });

  it('notifies subscribers and stops after unsubscribe', async () => {
    const seen: Settings[] = [];
    const unsubscribe = subscribeToSettings((settings) => seen.push(settings));

    await saveSettings({ filenameTemplate: '{id}' });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.filenameTemplate).toBe('{id}');

    unsubscribe();
    await saveSettings({ filenameTemplate: '{platform}' });
    expect(seen).toHaveLength(1);
  });

  it('resets to defaults', async () => {
    await saveSettings({ theme: 'dark', maxHistoryEntries: 100, demoMode: true });
    const settings = await resetSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings.demoMode).toBe(false);
    expect(await getSettings(true)).toEqual(DEFAULT_SETTINGS);
  });

  it('persists the demo-mode flag', async () => {
    expect((await getSettings()).demoMode).toBe(false);
    expect((await saveSettings({ demoMode: true })).demoMode).toBe(true);
    expect((await getSettings(true)).demoMode).toBe(true);
  });
});
