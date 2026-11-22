import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, HISTORY_STORE } from '@/constants';
import type { HistoryEntry } from '@/types/history';

interface MediaVaultDatabase extends DBSchema {
  history: {
    key: string;
    value: HistoryEntry;
    indexes: {
      'by-createdAt': number;
      'by-platform': string;
      'by-status': string;
    };
  };
}

let databasePromise: Promise<IDBPDatabase<MediaVaultDatabase>> | undefined;

export function getDb(): Promise<IDBPDatabase<MediaVaultDatabase>> {
  databasePromise ??= openDB<MediaVaultDatabase>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (database.objectStoreNames.contains(HISTORY_STORE)) {
        return;
      }

      const store = database.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      store.createIndex('by-createdAt', 'createdAt');
      store.createIndex('by-platform', 'platform');
      store.createIndex('by-status', 'status');
    },
  });

  return databasePromise;
}

export function resetDbForTests(): void {
  databasePromise = undefined;
}

export async function deleteDbForTests(): Promise<void> {
  if (databasePromise) {
    try {
      (await databasePromise).close();
    } catch {
      // Ignore a failed connection during teardown.
    }
    databasePromise = undefined;
  }

  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}
