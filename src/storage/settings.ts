import {
  DEFAULT_DOWNLOAD_CONCURRENCY,
  MAX_DOWNLOAD_CONCURRENCY,
  MAX_HISTORY_ENTRIES,
  MIN_DOWNLOAD_CONCURRENCY,
  MIN_HISTORY_ENTRIES,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
} from '@/constants';
import type { Settings, ThemePreference } from '@/types/settings';
import { AppError } from '@/utils/errors';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  downloadSubfolder: 'MediaVault',
  filenameTemplate: '{platform}-{author}-{id}',
  autoScan: true,
  historyEnabled: true,
  maxHistoryEntries: 500,
  demoMode: false,
  askWhereToSave: false,
  skipDownloaded: false,
  downloadConcurrency: DEFAULT_DOWNLOAD_CONCURRENCY,
};

interface SettingsEnvelope {
  version: number;
  data: Settings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceTheme(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : DEFAULT_SETTINGS.theme;
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function coerceString(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : fallback;
}

function coerceHistoryLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SETTINGS.maxHistoryEntries;
  }

  return Math.min(MAX_HISTORY_ENTRIES, Math.max(MIN_HISTORY_ENTRIES, Math.round(value)));
}

function coerceConcurrency(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SETTINGS.downloadConcurrency;
  }

  return Math.min(
    MAX_DOWNLOAD_CONCURRENCY,
    Math.max(MIN_DOWNLOAD_CONCURRENCY, Math.round(value)),
  );
}

export function coerceSettings(value: unknown): Settings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    theme: coerceTheme(value.theme),
    downloadSubfolder: coerceString(
      value.downloadSubfolder,
      DEFAULT_SETTINGS.downloadSubfolder,
      80,
    ),
    filenameTemplate: coerceString(
      value.filenameTemplate,
      DEFAULT_SETTINGS.filenameTemplate,
      120,
    ),
    autoScan: coerceBoolean(value.autoScan, DEFAULT_SETTINGS.autoScan),
    historyEnabled: coerceBoolean(value.historyEnabled, DEFAULT_SETTINGS.historyEnabled),
    maxHistoryEntries: coerceHistoryLimit(value.maxHistoryEntries),
    demoMode: coerceBoolean(value.demoMode, DEFAULT_SETTINGS.demoMode),
    askWhereToSave: coerceBoolean(
      value.askWhereToSave,
      DEFAULT_SETTINGS.askWhereToSave,
    ),
    skipDownloaded: coerceBoolean(
      value.skipDownloaded,
      DEFAULT_SETTINGS.skipDownloaded,
    ),
    downloadConcurrency: coerceConcurrency(value.downloadConcurrency),
  };
}

function parseStoredSettings(value: unknown): Settings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SETTINGS };
  }

  const candidate = isRecord(value.data) ? value.data : value;
  return coerceSettings(candidate);
}

let cachedSettings: Settings | null = null;
let inFlightLoad: Promise<Settings> | null = null;

export async function getSettings(force = false): Promise<Settings> {
  if (!force && cachedSettings) {
    return cachedSettings;
  }

  if (inFlightLoad) {
    return inFlightLoad;
  }

  inFlightLoad = (async () => {
    try {
      const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
      const settings = parseStoredSettings(stored[SETTINGS_STORAGE_KEY]);
      cachedSettings = settings;
      return settings;
    } catch (error) {
      throw new AppError(
        'STORAGE_FAILED',
        error instanceof Error
          ? `MediaVault could not read its settings: ${error.message}`
          : 'MediaVault could not read its settings.',
      );
    } finally {
      inFlightLoad = null;
    }
  })();

  return inFlightLoad;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = coerceSettings({ ...current, ...patch });
  const envelope: SettingsEnvelope = { version: SETTINGS_SCHEMA_VERSION, data: next };

  try {
    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: envelope });
  } catch (error) {
    throw new AppError(
      'STORAGE_FAILED',
      error instanceof Error
        ? `MediaVault could not save its settings: ${error.message}`
        : 'MediaVault could not save its settings.',
    );
  }

  cachedSettings = next;
  return next;
}

export async function resetSettings(): Promise<Settings> {
  cachedSettings = null;
  return saveSettings(DEFAULT_SETTINGS);
}

export function subscribeToSettings(listener: (settings: Settings) => void): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== 'local') {
      return;
    }

    const change = changes[SETTINGS_STORAGE_KEY];
    if (!change) {
      return;
    }

    const next = parseStoredSettings(change.newValue);
    cachedSettings = next;
    listener(next);
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

export function resetSettingsCacheForTests(): void {
  cachedSettings = null;
  inFlightLoad = null;
}
