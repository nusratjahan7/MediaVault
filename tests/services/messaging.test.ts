import { describe, expect, it } from 'vitest';
import { sendToBackground, sendToTab } from '@/services/messaging';
import { chromeMock } from '../mocks/chrome';

describe('messaging', () => {
  it('returns typed background responses', async () => {
    chromeMock.runtime.sendMessage.mockImplementationOnce((_message, callback) => {
      callback?.({ ok: true, data: [] });
    });

    const response = await sendToBackground({ type: 'SITES_STATUS' });
    expect(response).toEqual({ ok: true, data: [] });
  });

  it('rejects when Chrome reports a lastError', async () => {
    chromeMock.runtime.lastError = { message: 'Service worker unavailable' };
    chromeMock.runtime.sendMessage.mockImplementationOnce((_message, callback) => {
      callback?.(undefined);
    });

    await expect(sendToBackground({ type: 'SITES_STATUS' })).rejects.toMatchObject({
      code: 'MESSAGE_FAILED',
      message: 'Service worker unavailable',
    });
  });

  it('rejects with a timeout when no response arrives', async () => {
    chromeMock.runtime.sendMessage.mockImplementationOnce(() => undefined);

    await expect(sendToBackground({ type: 'SITES_STATUS' }, 30)).rejects.toMatchObject({
      code: 'TIMEOUT',
    });
  });

  it('sends content requests to a specific tab', async () => {
    chromeMock.tabs.sendMessage.mockImplementationOnce((_tabId, _message, callback) => {
      callback?.({
        ok: true,
        data: {
          platform: 'instagram',
          pageUrl: 'https://www.instagram.com/p/abc/',
          scannedAt: 1,
          items: [],
          limitations: [],
        },
      });
    });

    const response = await sendToTab(7, { type: 'SCAN_PAGE' });
    expect(response.ok).toBe(true);
    expect(response.ok && response.data.platform).toBe('instagram');
  });

  it('reports a clear error when the tab has no content script', async () => {
    chromeMock.runtime.lastError = { message: 'Receiving end does not exist' };
    chromeMock.tabs.sendMessage.mockImplementationOnce((_tabId, _message, callback) => {
      callback?.(undefined);
    });

    await expect(sendToTab(7, { type: 'SCAN_PAGE' })).rejects.toMatchObject({
      code: 'CONTENT_SCRIPT_FAILED',
    });
  });
});
