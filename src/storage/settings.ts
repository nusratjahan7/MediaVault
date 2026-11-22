import {
  DEFAULT_DOWNLOAD_CONCURRENCY,
  MAX_DOWNLOAD_CONCURRENCY,
  MAX_HISTORY_ENTRIES,
  MIN_DOWNLOAD_CONCURRENCY,
  MIN_HISTORY_ENTRIES,
  SETTINGS_SCHEMA_VERSION,
  SETTINGS_STORAGE_KEY,
} from '@/constants';
import type {
  FilenameTemplate,
  ImageFormatPreference,
  Settings,
  ThemePreference,
  VideoQualityPreference,
} from '@/types/settings';
import { AppError } from '@/utils/errors';

export const DEFAULT_FILENAME_TEMPLATES: FilenameTemplate[] = [
  {
    id: 'default',
    name: 'Default',
    template: '{platform}-{author}-{id}',
  },
  {
    id: 'dated',
    name: 'Dated',
    template: '{date}-{username}-{id}',
  },
  {
    id: 'caption',
    name: 'Caption',
    template: '{date}-{username}-{caption}',
  },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  downloadSubfolder: 'MediaVault',
  filenameTemplate: DEFAULT_FILENAME_TEMPLATES[0]!.template,
  filenameTemplates: DEFAULT_FILENAME_TEMPLATES.map((template) => ({ ...template })),
  selectedFilenameTemplateId: 'default',
  organizeByAccount: false,
  organizeByCategory: true,
  splitByMediaType: false,
  autoScan: true,
  historyEnabled: true,
  maxHistoryEntries: 500,
  demoMode: false,
  askWhereToSave: false,
  skipDownloaded: false,
  downloadConcurrency: DEFAULT_DOWNLOAD_CONCURRENCY,
  imageFormat: 'original',
  videoQuality: 'highest',
  downloadThumbnails: false,
  saveCaption: false,
  saveMetadata: false,
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

function coerceImageFormat(value: unknown): ImageFormatPreference {
  return value === 'jpeg' || value === 'png' || value === 'webp'
    ? value
    : DEFAULT_SETTINGS.imageFormat;
}

function coerceVideoQuality(value: unknown): VideoQualityPreference {
  return value === 'source' ? 'source' : DEFAULT_SETTINGS.videoQuality;
}

function defaultFilenameTemplates(): FilenameTemplate[] {
  return DEFAULT_FILENAME_TEMPLATES.map((template) => ({ ...template }));
}

function coerceFilenameTemplates(value: unknown): FilenameTemplate[] {
  if (!Array.isArray(value)) {
    return defaultFilenameTemplates();
  }

  const templates: FilenameTemplate[] = [];
  const seen = new Set<string>();

  for (const [index, raw] of value.slice(0, 20).entries()) {
    if (!isRecord(raw)) {
      continue;
    }

    const idSource = typeof raw.id === 'string' ? raw.id.trim() : '';
    const id = (idSource.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `template-${index}`)
      .toLowerCase();
    const nameSource = typeof raw.name === 'string' ? raw.name.trim() : '';
    const templateSource = typeof raw.template === 'string' ? raw.template.trim() : '';

    if (!templateSource || !nameSource || seen.has(id)) {
      continue;
    }

    seen.add(id);
    templates.push({
      id,
      name: nameSource.slice(0, 40),
      template: templateSource.slice(0, 160),
    });
  }

  return templates.length > 0 ? templates : defaultFilenameTemplates();
}

export function coerceSettings(value: unknown): Settings {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_SETTINGS,
      filenameTemplates: defaultFilenameTemplates(),
    };
  }

  const filenameTemplates = coerceFilenameTemplates(value.filenameTemplates);
  const selectedSource =
    typeof value.selectedFilenameTemplateId === 'string'
      ? value.selectedFilenameTemplateId.trim().toLowerCase()
      : '';
  const selectedFilenameTemplateId = filenameTemplates.some(
    (template) => template.id === selectedSource,
  )
    ? selectedSource
    : undefined;

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
      160,
    ),
    filenameTemplates,
    ...(selectedFilenameTemplateId ? { selectedFilenameTemplateId } : {}),
    organizeByAccount: coerceBoolean(
      value.organizeByAccount,
      DEFAULT_SETTINGS.organizeByAccount,
    ),
    organizeByCategory: coerceBoolean(
      value.organizeByCategory,
      DEFAULT_SETTINGS.organizeByCategory,
    ),
    splitByMediaType: coerceBoolean(
      value.splitByMediaType,
      DEFAULT_SETTINGS.splitByMediaType,
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
    imageFormat: coerceImageFormat(value.imageFormat),
    videoQuality: coerceVideoQuality(value.videoQuality),
    downloadThumbnails: coerceBoolean(
      value.downloadThumbnails,
      DEFAULT_SETTINGS.downloadThumbnails,
    ),
    saveCaption: coerceBoolean(value.saveCaption, DEFAULT_SETTINGS.saveCaption),
    saveMetadata: coerceBoolean(value.saveMetadata, DEFAULT_SETTINGS.saveMetadata),
  };
}

function parseStoredSettings(value: unknown): Settings {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_SETTINGS,
      filenameTemplates: defaultFilenameTemplates(),
    };
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
