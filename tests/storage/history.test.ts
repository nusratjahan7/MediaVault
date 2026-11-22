import { describe, expect, it } from 'vitest';
import {
  addHistoryEntry,
  clearHistory,
  countHistoryByStatus,
  deleteHistoryEntry,
  findHistoryByDownloadId,
  getActiveHistoryEntries,
  getHistoryEntry,
  pruneHistory,
  queryHistory,
  updateHistoryEntry,
} from '@/storage/history';
import type { HistoryEntry } from '@/types/history';

function makeEntry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  const base = 1_700_000_000_000;

  return {
    id: 'entry-1',
    item: {
      id: 'instagram_abc12345',
      platform: 'instagram',
      kind: 'image',
      url: 'https://cdn.example.com/photo.jpg',
      author: 'studio',
      downloadable: true,
    },
    filename: 'MediaVault/instagram/photo.jpg',
    status: 'queued',
    createdAt: base,
    updatedAt: base,
    ...overrides,
  };
}

describe('history storage', () => {
  it('adds and reads an entry', async () => {
    const entry = makeEntry();
    await addHistoryEntry(entry);

    await expect(getHistoryEntry(entry.id)).resolves.toEqual(entry);
  });

  it('updates status without changing identity fields', async () => {
    await addHistoryEntry(makeEntry());

    const updated = await updateHistoryEntry('entry-1', {
      status: 'completed',
      downloadId: 42,
      updatedAt: 1_700_000_100_000,
    });

    expect(updated?.status).toBe('completed');
    expect(updated?.downloadId).toBe(42);
    expect(updated?.createdAt).toBe(1_700_000_000_000);
    expect(updated?.updatedAt).toBe(1_700_000_100_000);
  });

  it('returns undefined when updating a missing entry', async () => {
    await expect(updateHistoryEntry('missing', { status: 'failed' })).resolves.toBeUndefined();
  });

  it('finds entries by download id', async () => {
    await addHistoryEntry(makeEntry({ downloadId: 7 }));

    const found = await findHistoryByDownloadId(7);
    expect(found?.id).toBe('entry-1');
    expect(await findHistoryByDownloadId(999)).toBeUndefined();
  });

  it('queries with filters, search, sorting, and pagination', async () => {
    await addHistoryEntry(
      makeEntry({
        id: 'old',
        createdAt: 100,
        updatedAt: 100,
        status: 'completed',
        filename: 'MediaVault/instagram/old-photo.jpg',
      }),
    );
    await addHistoryEntry(
      makeEntry({
        id: 'new',
        createdAt: 300,
        updatedAt: 300,
        status: 'failed',
        filename: 'MediaVault/tiktok/clip.mp4',
        item: {
          id: 'tiktok_1',
          platform: 'tiktok',
          kind: 'video',
          url: 'https://cdn.example.com/clip.mp4',
          author: 'creator',
          downloadable: true,
        },
      }),
    );
    await addHistoryEntry(
      makeEntry({
        id: 'middle',
        createdAt: 200,
        updatedAt: 200,
        status: 'completed',
        filename: 'MediaVault/instagram/middle-photo.jpg',
      }),
    );

    const page = await queryHistory({ limit: 2 });
    expect(page.entries.map((entry) => entry.id)).toEqual(['new', 'middle']);
    expect(page.total).toBe(3);
    expect(page.hasMore).toBe(true);

    const secondPage = await queryHistory({ limit: 2, offset: 2 });
    expect(secondPage.entries.map((entry) => entry.id)).toEqual(['old']);
    expect(secondPage.hasMore).toBe(false);

    const failed = await queryHistory({ status: 'failed' });
    expect(failed.entries.map((entry) => entry.id)).toEqual(['new']);

    const instagram = await queryHistory({ platform: 'instagram' });
    expect(instagram.entries.map((entry) => entry.id)).toEqual(['middle', 'old']);

    const searched = await queryHistory({ search: 'clip' });
    expect(searched.entries.map((entry) => entry.id)).toEqual(['new']);
  });

  it('lists active downloads in creation order', async () => {
    await addHistoryEntry(makeEntry({ id: 'downloading', status: 'downloading', createdAt: 2 }));
    await addHistoryEntry(makeEntry({ id: 'queued', status: 'queued', createdAt: 1 }));
    await addHistoryEntry(makeEntry({ id: 'done', status: 'completed', createdAt: 3 }));

    const active = await getActiveHistoryEntries();
    expect(active.map((entry) => entry.id)).toEqual(['queued', 'downloading']);
    expect(await countHistoryByStatus('completed')).toBe(1);
  });

  it('deletes entries', async () => {
    await addHistoryEntry(makeEntry());

    await expect(deleteHistoryEntry('entry-1')).resolves.toBe(true);
    await expect(deleteHistoryEntry('entry-1')).resolves.toBe(false);
    expect(await getHistoryEntry('entry-1')).toBeUndefined();
  });

  it('clears all entries', async () => {
    await addHistoryEntry(makeEntry({ id: 'a' }));
    await addHistoryEntry(makeEntry({ id: 'b' }));

    await expect(clearHistory()).resolves.toBe(2);
    await expect(queryHistory()).resolves.toMatchObject({ total: 0, entries: [] });
  });

  it('prunes the oldest entries', async () => {
    for (let index = 0; index < 5; index += 1) {
      await addHistoryEntry(
        makeEntry({ id: `entry-${index}`, createdAt: 1_000 + index, updatedAt: 1_000 + index }),
      );
    }

    await expect(pruneHistory(2)).resolves.toBe(3);
    const page = await queryHistory();
    expect(page.entries.map((entry) => entry.id)).toEqual(['entry-4', 'entry-3']);
  });
});
