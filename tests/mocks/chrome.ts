import { vi } from 'vitest';

type Listener = (...args: unknown[]) => unknown;

class EventMock {
  private listeners = new Set<Listener>();

  addListener(listener: Listener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: Listener): void {
    this.listeners.delete(listener);
  }

  hasListener(listener: Listener): boolean {
    return this.listeners.has(listener);
  }

  emit(...args: unknown[]): void {
    for (const listener of [...this.listeners]) {
      listener(...args);
    }
  }

  getListeners(): Listener[] {
    return [...this.listeners];
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const storageOnChanged = new EventMock();
export const downloadsOnChanged = new EventMock();
export const permissionsOnRemoved = new EventMock();
export const runtimeOnMessage = new EventMock();

const storageData = new Map<string, unknown>();
const grantedOrigins = new Set<string>();
const downloadItems = new Map<number, chrome.downloads.DownloadItem>();
const downloadOptions = new Map<number, chrome.downloads.DownloadOptions>();
const registeredScripts = new Map<string, chrome.scripting.RegisteredContentScript>();
const tabs = new Map<number, chrome.tabs.Tab>();

let nextDownloadId = 1;

function defaultTabs(): void {
  tabs.clear();
  tabs.set(1, {
    id: 1,
    active: true,
    windowId: 1,
    url: 'https://www.instagram.com/p/abc/',
    title: 'Instagram',
  } as chrome.tabs.Tab);
}

defaultTabs();

function clone<T>(value: T): T {
  return structuredClone(value);
}

export const chromeMock = {
  runtime: {
    id: 'mediavault-test-id',
    lastError: undefined as { message?: string } | undefined,
    onMessage: runtimeOnMessage,
    sendMessage: vi.fn((message: unknown, callback?: (response: unknown) => void) => {
      let responded = false;
      const respond = (response: unknown) => {
        if (responded) {
          return;
        }
        responded = true;
        callback?.(response);
      };

      for (const listener of runtimeOnMessage.getListeners()) {
        const result = listener(message, { id: 'mediavault-test-id' }, respond);
        if (result === true) {
          return;
        }
      }

      respond(undefined);
    }),
    openOptionsPage: vi.fn(async () => undefined),
    getURL: vi.fn((path: string) => `chrome-extension://mediavault-test-id/${path}`),
    onInstalled: new EventMock(),
    onStartup: new EventMock(),
  },
  storage: {
    local: {
      get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
        if (keys === undefined || keys === null) {
          return Object.fromEntries(storageData);
        }

        if (typeof keys === 'string') {
          return { [keys]: clone(storageData.get(keys)) };
        }

        if (Array.isArray(keys)) {
          return Object.fromEntries(keys.map((key) => [key, clone(storageData.get(key))]));
        }

        return Object.fromEntries(
          Object.keys(keys).map((key) => [
            key,
            storageData.has(key) ? clone(storageData.get(key)) : keys[key],
          ]),
        );
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};

        for (const [key, value] of Object.entries(items)) {
          changes[key] = { oldValue: storageData.get(key), newValue: value };
          storageData.set(key, clone(value));
        }

        storageOnChanged.emit(changes, 'local');
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const list = Array.isArray(keys) ? keys : [keys];
        const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};

        for (const key of list) {
          changes[key] = { oldValue: storageData.get(key), newValue: undefined };
          storageData.delete(key);
        }

        storageOnChanged.emit(changes, 'local');
      }),
      clear: vi.fn(async () => {
        storageData.clear();
        storageOnChanged.emit({}, 'local');
      }),
    },
    onChanged: storageOnChanged,
  },
  downloads: {
    onChanged: downloadsOnChanged,
    download: vi.fn(async (options: chrome.downloads.DownloadOptions) => {
      const id = nextDownloadId;
      nextDownloadId += 1;

      downloadOptions.set(id, options);
      downloadItems.set(id, {
        id,
        url: options.url,
        finalUrl: options.url,
        filename: options.filename ?? '',
        state: 'in_progress',
        paused: false,
        canResume: false,
        danger: 'safe',
        incognito: false,
        bytesReceived: 0,
        totalBytes: 0,
        fileSize: 0,
        exists: false,
      } as chrome.downloads.DownloadItem);

      return id;
    }),
    search: vi.fn(async (query: chrome.downloads.DownloadQuery) => {
      if (query.id !== undefined) {
        const item = downloadItems.get(query.id);
        return item ? [clone(item)] : [];
      }

      return [...downloadItems.values()].map((item) => clone(item));
    }),
    cancel: vi.fn(async (downloadId: number) => {
      const item = downloadItems.get(downloadId);
      if (item) {
        item.state = 'interrupted';
        item.error = 'USER_CANCELED';
      }
    }),
    show: vi.fn(async () => undefined),
  },
  tabs: {
    get: vi.fn(async (tabId: number) => {
      const tab = tabs.get(tabId);
      if (!tab) {
        throw new Error('No tab with id');
      }
      return clone(tab);
    }),
    query: vi.fn(async () => [...tabs.values()].filter((tab) => tab.active).map((tab) => clone(tab))),
    create: vi.fn(async (properties: chrome.tabs.CreateProperties) => {
      const id = 100 + tabs.size;
      const tab = {
        id,
        active: properties.active ?? true,
        windowId: 1,
        url: properties.url ?? '',
        title: 'MediaVault',
      } as chrome.tabs.Tab;
      tabs.set(id, tab);
      return clone(tab);
    }),
    sendMessage: vi.fn(
      (_tabId: number, _message: unknown, callback?: (response: unknown) => void) => {
        callback?.(undefined);
      },
    ),
  },
  scripting: {
    getRegisteredContentScripts: vi.fn(
      async (filter?: { ids?: string[] }) => {
        if (filter?.ids) {
          return filter.ids
            .map((id) => registeredScripts.get(id))
            .filter((script): script is chrome.scripting.RegisteredContentScript =>
              Boolean(script),
            );
        }

        return [...registeredScripts.values()];
      },
    ),
    registerContentScripts: vi.fn(
      async (scripts: chrome.scripting.RegisteredContentScript[]) => {
        for (const script of scripts) {
          if (script.id) {
            registeredScripts.set(script.id, script);
          }
        }
      },
    ),
    unregisterContentScripts: vi.fn(async (filter?: { ids?: string[] }) => {
      for (const id of filter?.ids ?? []) {
        registeredScripts.delete(id);
      }
    }),
    executeScript: vi.fn(async () => []),
  },
  permissions: {
    contains: vi.fn(async (request: chrome.permissions.Permissions) =>
      (request.origins ?? []).every((origin) => grantedOrigins.has(origin)),
    ),
    request: vi.fn(async (request: chrome.permissions.Permissions) => {
      for (const origin of request.origins ?? []) {
        grantedOrigins.add(origin);
      }
      return true;
    }),
    remove: vi.fn(async (request: chrome.permissions.Permissions) => {
      let removed = false;

      for (const origin of request.origins ?? []) {
        if (grantedOrigins.delete(origin)) {
          removed = true;
        }
      }

      if (removed) {
        permissionsOnRemoved.emit(request);
      }

      return removed;
    }),
    getAll: vi.fn(async () => ({
      origins: [...grantedOrigins],
      permissions: [],
      allOrigins: [],
    })),
    onRemoved: permissionsOnRemoved,
  },
  sidePanel: {
    open: vi.fn(async () => undefined),
  },
  windows: {
    WINDOW_ID_CURRENT: -2,
  },
};

export function installChromeMock(): void {
  (globalThis as unknown as { chrome: unknown }).chrome = chromeMock;
}

export function resetChromeMock(): void {
  storageData.clear();
  grantedOrigins.clear();
  downloadItems.clear();
  downloadOptions.clear();
  registeredScripts.clear();
  nextDownloadId = 1;
  defaultTabs();

  storageOnChanged.clear();
  downloadsOnChanged.clear();
  permissionsOnRemoved.clear();
  runtimeOnMessage.clear();

  chromeMock.runtime.lastError = undefined;
  vi.clearAllMocks();
}

export function setActiveTabUrl(url: string): void {
  const tab = tabs.get(1);
  if (tab) {
    tab.url = url;
  }
}

export function getLastDownloadId(): number | undefined {
  const ids = [...downloadItems.keys()];
  return ids.at(-1);
}

export function getLastDownloadOptions(): chrome.downloads.DownloadOptions | undefined {
  const id = getLastDownloadId();
  return id === undefined ? undefined : downloadOptions.get(id);
}

export function completeDownload(downloadId: number): void {
  const item = downloadItems.get(downloadId);
  if (!item) {
    return;
  }

  item.state = 'complete';
  item.exists = true;
  downloadsOnChanged.emit({ id: downloadId, state: { current: 'complete' } });
}

export function failDownload(
  downloadId: number,
  error: chrome.downloads.DownloadInterruptReason = 'NETWORK_FAILED',
): void {
  const item = downloadItems.get(downloadId);
  if (!item) {
    return;
  }

  item.state = 'interrupted';
  item.error = error;
  downloadsOnChanged.emit({
    id: downloadId,
    state: { current: 'interrupted' },
    error: { current: error },
  });
}

export function grantOrigin(origin: string): void {
  grantedOrigins.add(origin);
}

export function getRegisteredScriptIds(): string[] {
  return [...registeredScripts.keys()];
}

export function getStorageValue<T>(key: string): T | undefined {
  return storageData.get(key) as T | undefined;
}
