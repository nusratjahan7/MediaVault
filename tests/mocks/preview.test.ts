import { describe, expect, it } from 'vitest';
import {
  getDefaultPreviewAccount,
  getMockAccounts,
  MOCK_ACCOUNTS,
} from '@/mocks/accounts';
import { MOCK_HISTORY } from '@/mocks/history';
import { getMockScanResult, MOCK_MEDIA } from '@/mocks/media';
import { getMockPageContext } from '@/mocks/pages';
import {
  getSelectedPreviewAccount,
  getSelectedPreviewAccounts,
  selectPreviewAccount,
  subscribeToPreviewAccounts,
} from '@/mocks/preview-preferences';
import {
  advanceMockQueue,
  createInitialMockQueue,
  createMockQueueItemsFromMedia,
} from '@/mocks/queue';

describe('mock media layer', () => {
  it('provides platform-scoped HTTPS-only sample scans', () => {
    for (const platform of ['instagram', 'facebook', 'tiktok'] as const) {
      const result = getMockScanResult(platform);

      expect(result.platform).toBe(platform);
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.limitations.length).toBeGreaterThan(0);

      for (const item of result.items) {
        expect(item.platform).toBe(platform);
        expect(item.url).toMatch(/^https:\/\//);
        expect(item.id.startsWith(`${platform}_`)).toBe(true);
      }
    }
  });

  it('includes a non-downloadable Facebook stream in the sample set', () => {
    const facebook = getMockScanResult('facebook');

    expect(facebook.items.some((item) => !item.downloadable)).toBe(true);
    expect(facebook.limitations.map((entry) => entry.code)).toContain('blob-video');
  });

  it('builds page context from the selected preview account', () => {
    const account = getDefaultPreviewAccount('tiktok');
    const context = getMockPageContext('tiktok', account);

    expect(context.mode).toBe('demo');
    expect(context.platform).toBe('tiktok');
    expect(context.accountName).toBe(account.displayName);
    expect(context.handle).toBe(account.handle);
    expect(context.mediaCount).toBe(3);
  });
});

describe('mock accounts and preview preferences', () => {
  it('has accounts for every platform', () => {
    expect(MOCK_ACCOUNTS.length).toBeGreaterThanOrEqual(9);
    expect(getMockAccounts('instagram')).toHaveLength(3);
    expect(getMockAccounts('facebook')).toHaveLength(3);
    expect(getMockAccounts('tiktok')).toHaveLength(3);
  });

  it('returns the default account before any selection', async () => {
    const account = await getSelectedPreviewAccount('instagram');

    expect(account.id).toBe('ig-north');
    expect(account.platform).toBe('instagram');
  });

  it('persists selections per platform', async () => {
    await selectPreviewAccount('instagram', 'ig-maya');
    await selectPreviewAccount('tiktok', 'tt-maya');

    const selected = await getSelectedPreviewAccounts();
    expect(selected.instagram).toBe('ig-maya');
    expect(selected.tiktok).toBe('tt-maya');

    await expect(getSelectedPreviewAccount('instagram')).resolves.toMatchObject({
      id: 'ig-maya',
      displayName: 'Maya Chen',
    });
  });

  it('rejects accounts that belong to another platform', async () => {
    await expect(selectPreviewAccount('instagram', 'fb-atlas')).rejects.toThrow(
      /not available/i,
    );
  });

  it('notifies subscribers when a selection changes', async () => {
    const seen: Array<{ tiktok?: string }> = [];
    const unsubscribe = subscribeToPreviewAccounts((selected) => {
      seen.push(selected);
    });

    await selectPreviewAccount('tiktok', 'tt-lumen');
    expect(seen.at(-1)?.tiktok).toBe('tt-lumen');

    unsubscribe();
    await selectPreviewAccount('tiktok', 'tt-maya');
    expect(seen.at(-1)?.tiktok).toBe('tt-lumen');
  });
});

describe('mock queue and history', () => {
  it('simulates queue progress deterministically without Chrome downloads', () => {
    const initial = createInitialMockQueue();
    const advanced = advanceMockQueue(initial);

    expect(initial.some((item) => item.status === 'queued')).toBe(true);
    expect(advanced.some((item) => item.status === 'downloading')).toBe(true);

    let items = advanced;
    for (let index = 0; index < 12; index += 1) {
      items = advanceMockQueue(items);
    }

    expect(items.every((item) => item.status === 'completed')).toBe(true);
    expect(items.every((item) => item.progress === 100)).toBe(true);
  });

  it('skips non-downloadable media when adding to the preview queue', () => {
    const source = MOCK_MEDIA.instagram;
    const withUnsupported = [
      ...source,
      {
        ...source[0]!,
        id: 'instagram_unsupported',
        downloadable: false,
      },
    ];

    const queued = createMockQueueItemsFromMedia(withUnsupported);
    expect(queued).toHaveLength(source.filter((item) => item.downloadable).length);
    expect(queued.every((item) => item.status === 'queued')).toBe(true);
  });

  it('covers representative history states', () => {
    const statuses = new Set(MOCK_HISTORY.map((entry) => entry.status));

    expect(statuses).toContain('completed');
    expect(statuses).toContain('downloading');
    expect(statuses).toContain('queued');
    expect(statuses).toContain('failed');
    expect(statuses).toContain('interrupted');
    expect(statuses).toContain('cancelled');
  });
});
