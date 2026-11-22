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

  it('persists the Save As preference', async () => {
    expect((await getSettings()).askWhereToSave).toBe(false);
    expect((await saveSettings({ askWhereToSave: true })).askWhereToSave).toBe(true);
    expect((await getSettings(true)).askWhereToSave).toBe(true);
  });

  it('persists the Skip Downloaded preference', async () => {
    expect((await getSettings()).skipDownloaded).toBe(false);
    expect((await saveSettings({ skipDownloaded: true })).skipDownloaded).toBe(true);
    expect((await getSettings(true)).skipDownloaded).toBe(true);
  });

  it('defaults folder organization, saved templates, and format preferences', async () => {
    const settings = await getSettings();

    expect(settings.organizeByAccount).toBe(false);
    expect(settings.organizeByCategory).toBe(true);
    expect(settings.splitByMediaType).toBe(false);
    expect(settings.selectedFilenameTemplateId).toBe('default');
    expect(settings.filenameTemplates.length).toBeGreaterThan(0);
    expect(settings.imageFormat).toBe('original');
    expect(settings.videoQuality).toBe('highest');
    expect(settings.downloadThumbnails).toBe(false);
    expect(settings.saveCaption).toBe(false);
    expect(settings.saveMetadata).toBe(false);
  });

  it('persists reusable filename templates and selected template', async () => {
    const saved = await saveSettings({
      filenameTemplates: [
        {
          id: 'caption',
          name: 'Caption',
          template: '{date}-{username}-{caption}',
        },
      ],
      selectedFilenameTemplateId: 'caption',
      filenameTemplate: '{date}-{username}-{caption}',
      organizeByAccount: true,
      splitByMediaType: true,
      imageFormat: 'webp',
      videoQuality: 'source',
      saveCaption: true,
      saveMetadata: true,
      downloadThumbnails: true,
    });

    expect(saved.selectedFilenameTemplateId).toBe('caption');
    expect(saved.filenameTemplates).toHaveLength(1);
    expect(saved.organizeByAccount).toBe(true);
    expect(saved.imageFormat).toBe('webp');
    expect(saved.videoQuality).toBe('source');
    expect(saved.saveCaption).toBe(true);
    expect(saved.saveMetadata).toBe(true);
    expect(saved.downloadThumbnails).toBe(true);
  });

  it('repairs invalid template libraries and format values', async () => {
    await chrome.storage.local.set({
      [SETTINGS_STORAGE_KEY]: {
        version: 1,
        data: {
          filenameTemplates: [
            { id: 'ok', name: '  OK  ', template: '{platform}' },
            { id: 'ok', name: 'Duplicate', template: '{id}' },
            { id: 'bad', name: '', template: '{id}' },
          ],
          selectedFilenameTemplateId: 'missing',
          imageFormat: 'gif',
          videoQuality: '8k',
        },
      },
    });

    const settings = await getSettings(true);

    expect(settings.filenameTemplates).toEqual([
      { id: 'ok', name: 'OK', template: '{platform}' },
    ]);
    expect(settings.selectedFilenameTemplateId).toBeUndefined();
    expect(settings.imageFormat).toBe('original');
    expect(settings.videoQuality).toBe('highest');
  });

  it('defaults and validates advanced download settings', async () => {
    const defaults = await getSettings();
    expect(defaults.downloadNewMediaOnly).toBe(false);
    expect(defaults.retryCount).toBe(0);
    expect(defaults.confirmBulkDownload).toBe(false);
    expect(defaults.showDownloadNotifications).toBe(false);
    expect(defaults.autoClearHistoryDays).toBe(0);

    const saved = await saveSettings({
      downloadNewMediaOnly: true,
      retryCount: 9,
      confirmBulkDownload: true,
      showDownloadNotifications: true,
      autoClearHistoryDays: 5,
    });

    expect(saved.downloadNewMediaOnly).toBe(true);
    expect(saved.retryCount).toBe(3);
    expect(saved.confirmBulkDownload).toBe(true);
    expect(saved.showDownloadNotifications).toBe(true);
    expect(saved.autoClearHistoryDays).toBe(0);
    expect((await saveSettings({ retryCount: -4 })).retryCount).toBe(0);
    expect((await saveSettings({ autoClearHistoryDays: 7 })).autoClearHistoryDays).toBe(7);
  });

  it('clamps download concurrency to the supported range', async () => {
    expect((await getSettings()).downloadConcurrency).toBe(2);
    expect((await saveSettings({ downloadConcurrency: 9 })).downloadConcurrency).toBe(3);
    expect((await saveSettings({ downloadConcurrency: 0 })).downloadConcurrency).toBe(1);
    expect((await saveSettings({ downloadConcurrency: 2 })).downloadConcurrency).toBe(2);
  });
});
