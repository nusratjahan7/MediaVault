import { DEFAULT_HISTORY_LIMIT } from '@/constants';
import type {
  DownloadStatus,
  HistoryEntry,
  HistoryPage,
  HistoryQuery,
} from '@/types/history';
import { getDb } from './db';

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const db = await getDb();
  await db.put('history', entry);
}

export async function getHistoryEntry(id: string): Promise<HistoryEntry | undefined> {
  const db = await getDb();
  return db.get('history', id);
}

export async function updateHistoryEntry(
  id: string,
  patch: Partial<Omit<HistoryEntry, 'id' | 'createdAt'>>,
): Promise<HistoryEntry | undefined> {
  const db = await getDb();
  const transaction = db.transaction('history', 'readwrite');
  const existing = await transaction.store.get(id);

  if (!existing) {
    await transaction.done;
    return undefined;
  }

  const next: HistoryEntry = {
    ...existing,
    ...patch,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: patch.updatedAt ?? Date.now(),
  };

  await transaction.store.put(next);
  await transaction.done;
  return next;
}

export async function findHistoryByDownloadId(
  downloadId: number,
): Promise<HistoryEntry | undefined> {
  const db = await getDb();
  const entries = await db.getAll('history');
  return entries.find((entry) => entry.downloadId === downloadId);
}

export async function getActiveHistoryEntries(): Promise<HistoryEntry[]> {
  const db = await getDb();
  const [downloading, queued] = await Promise.all([
    db.getAllFromIndex('history', 'by-status', 'downloading'),
    db.getAllFromIndex('history', 'by-status', 'queued'),
  ]);
  return [...downloading, ...queued].sort((a, b) => a.createdAt - b.createdAt);
}

export async function queryHistory(query: HistoryQuery = {}): Promise<HistoryPage> {
  const db = await getDb();
  const all = await db.getAll('history');
  const platform = query.platform ?? 'all';
  const status = query.status ?? 'all';
  const search = query.search?.trim().toLowerCase();
  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.min(Math.max(1, query.limit ?? DEFAULT_HISTORY_LIMIT), 100);

  const filtered = all
    .filter((entry) => {
      if (platform !== 'all' && entry.item.platform !== platform) {
        return false;
      }

      if (status !== 'all' && entry.status !== status) {
        return false;
      }

      if (search) {
        const haystack = [
          entry.filename,
          entry.item.author,
          entry.item.caption,
          entry.item.platform,
        ]
          .filter((part): part is string => typeof part === 'string' && part.length > 0)
          .join(' ')
          .toLowerCase();

        if (!haystack.includes(search)) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  const entries = filtered.slice(offset, offset + limit);

  return {
    entries,
    total: filtered.length,
    hasMore: offset + entries.length < filtered.length,
  };
}

export async function deleteHistoryEntry(id: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.get('history', id);
  if (!existing) {
    return false;
  }

  await db.delete('history', id);
  return true;
}

export async function clearHistory(): Promise<number> {
  const db = await getDb();
  const count = await db.count('history');
  await db.clear('history');
  return count;
}

export async function pruneHistory(maxEntries: number): Promise<number> {
  const db = await getDb();
  const all = await db.getAll('history');
  const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
  const extras = sorted.slice(Math.max(0, maxEntries));

  if (extras.length === 0) {
    return 0;
  }

  const transaction = db.transaction('history', 'readwrite');
  await Promise.all(extras.map((entry) => transaction.store.delete(entry.id)));
  await transaction.done;
  return extras.length;
}

export async function countHistoryByStatus(status: DownloadStatus): Promise<number> {
  const db = await getDb();
  return db.countFromIndex('history', 'by-status', status);
}

export async function hasCompletedMedia(
  mediaId: string,
  mediaUrl: string,
): Promise<boolean> {
  const db = await getDb();
  const entries = await db.getAll('history');

  return entries.some(
    (entry) =>
      entry.status === 'completed' &&
      (entry.item.id === mediaId || entry.item.url === mediaUrl),
  );
}
