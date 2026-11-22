import { beforeEach, describe, expect, it } from 'vitest';
import { registerBackgroundRouter } from '@/background/router';
import type { SiteStatus } from '@/types/platform';
import { chromeMock, runtimeOnMessage, setActiveTabUrl } from '../mocks/chrome';

type SendResponse = (response: unknown) => void;
type RouterListener = (
  message: unknown,
  sender: unknown,
  sendResponse: SendResponse,
) => boolean | undefined;

interface DispatchResponse {
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

function getRouterListener(): RouterListener {
  const listener = runtimeOnMessage.getListeners().at(-1);
  if (!listener) {
    throw new Error('Background router did not register a listener.');
  }

  return listener as RouterListener;
}

async function dispatch(
  message: unknown,
  sender: unknown = { id: chromeMock.runtime.id },
): Promise<DispatchResponse | undefined> {
  const listener = getRouterListener();

  return new Promise((resolve) => {
    const handled = listener(message, sender, (response) => {
      resolve(response as DispatchResponse);
    });

    if (handled !== true) {
      resolve(undefined);
    }
  });
}

beforeEach(() => {
  registerBackgroundRouter();
});

describe('background message router', () => {
  it('ignores push events and unknown message shapes', async () => {
    await expect(dispatch({ type: 'DOWNLOADS_UPDATED', entries: [] })).resolves.toBeUndefined();
    await expect(dispatch({ type: 'NOT_A_REQUEST' })).resolves.toBeUndefined();
    await expect(dispatch('hello')).resolves.toBeUndefined();
  });

  it('rejects messages from a different extension id', async () => {
    await expect(
      dispatch({ type: 'HISTORY_QUERY', query: {} }, { id: 'other-extension' }),
    ).resolves.toBeUndefined();
  });

  it('routes a history query and returns an ApiResponse envelope', async () => {
    const response = await dispatch({ type: 'HISTORY_QUERY', query: { limit: 10 } });

    expect(response).toEqual({
      ok: true,
      data: { entries: [], total: 0, hasMore: false },
    });
  });

  it('serializes handler failures through the centralized error boundary', async () => {
    setActiveTabUrl('https://example.com/');

    const response = await dispatch({ type: 'SCAN_TAB', tabId: 1 });

    expect(response?.ok).toBe(false);
    expect(response?.error?.code).toBe('NOT_SUPPORTED');
    expect(response?.error?.message).toMatch(/Instagram, Facebook, and TikTok/);
  });

  it('validates download requests before reaching the queue', async () => {
    const response = await dispatch({ type: 'DOWNLOAD_ITEMS', items: [] });

    expect(response?.ok).toBe(false);
    expect(response?.error?.code).toBe('INVALID_INPUT');
    expect(chromeMock.downloads.download).not.toHaveBeenCalled();

    const malformed = await dispatch({
      type: 'DOWNLOAD_ITEMS',
      items: [{ id: 42, platform: 'instagram', kind: 'video', url: 'https://x', downloadable: true }],
    });
    expect(malformed?.ok).toBe(false);
    expect(malformed?.error?.code).toBe('INVALID_INPUT');
  });

  it('rejects malformed request payloads before handlers run', async () => {
    await expect(dispatch({ type: 'SCAN_TAB', tabId: 'one' })).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
    await expect(
      dispatch({ type: 'SITES_REGISTER', platform: 'example' }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
    await expect(
      dispatch({ type: 'HISTORY_QUERY', query: null }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_INPUT' },
    });
  });

  it('returns a dashboard snapshot through the typed route', async () => {
    const response = await dispatch({ type: 'DASHBOARD_QUERY' });

    expect(response).toMatchObject({
      ok: true,
      data: {
        entries: [],
        completedFiles: 0,
        completedBytes: 0,
      },
    });
  });

  it('routes retry requests through the download service', async () => {
    const response = await dispatch({
      type: 'RETRY_DOWNLOAD',
      historyId: 'missing-download',
    });

    expect(response).toEqual({ ok: true, data: { retried: false } });
  });

  it('routes pause and resume requests through the download service', async () => {
    await expect(
      dispatch({ type: 'PAUSE_DOWNLOAD', historyId: 'missing-download' }),
    ).resolves.toEqual({ ok: true, data: { paused: false } });
    await expect(
      dispatch({ type: 'RESUME_DOWNLOAD', historyId: 'missing-download' }),
    ).resolves.toEqual({ ok: true, data: { resumed: false } });
  });

  it('reports every platform as disabled before access is granted', async () => {
    const response = await dispatch({ type: 'SITES_STATUS' });

    expect(response?.ok).toBe(true);
    const statuses = response?.data as SiteStatus[];

    expect(statuses.map((status) => status.platform)).toEqual([
      'instagram',
      'facebook',
      'tiktok',
    ]);
    expect(statuses.every((status) => !status.enabled)).toBe(true);
    expect(statuses.every((status) => !status.permissionGranted)).toBe(true);
  });
});
