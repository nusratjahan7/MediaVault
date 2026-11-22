import { describe, expect, it } from 'vitest';
import {
  getGrantedPlatforms,
  getSiteStatuses,
  hasSitePermission,
  requestSiteAccess,
  revokeSiteAccess,
} from '@/services/permissions';
import { chromeMock, grantOrigin } from '../mocks/chrome';

const INSTAGRAM_STATUS = {
  platform: 'instagram' as const,
  label: 'Instagram',
  enabled: true,
  permissionGranted: true,
};

describe('site permissions', () => {
  it('requests only the platform origin and registers the content script', async () => {
    chromeMock.runtime.sendMessage.mockImplementationOnce((_message, callback) => {
      callback?.({ ok: true, data: INSTAGRAM_STATUS });
    });

    const status = await requestSiteAccess('instagram', 5);

    expect(chromeMock.permissions.request).toHaveBeenCalledWith({
      origins: ['https://*.instagram.com/*'],
    });
    expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SITES_REGISTER', platform: 'instagram', tabId: 5 }),
      expect.any(Function),
    );
    expect(status).toEqual(INSTAGRAM_STATUS);
    await expect(hasSitePermission('instagram')).resolves.toBe(true);
  });

  it('rejects when the user declines access', async () => {
    chromeMock.permissions.request.mockResolvedValueOnce(false);

    await expect(requestSiteAccess('tiktok', 5)).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });
    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('revokes site access after unregistering', async () => {
    grantOrigin('https://*.facebook.com/*');
    chromeMock.runtime.sendMessage.mockImplementationOnce((_message, callback) => {
      callback?.({
        ok: true,
        data: {
          platform: 'facebook',
          label: 'Facebook',
          enabled: false,
          permissionGranted: false,
        },
      });
    });

    const status = await revokeSiteAccess('facebook');

    expect(chromeMock.permissions.remove).toHaveBeenCalledWith({
      origins: ['https://*.facebook.com/*'],
    });
    expect(status.enabled).toBe(false);
    await expect(hasSitePermission('facebook')).resolves.toBe(false);
  });

  it('detects granted platforms from Chrome permissions', async () => {
    grantOrigin('https://*.instagram.com/*');
    grantOrigin('https://*.tiktok.com/*');

    await expect(getGrantedPlatforms()).resolves.toEqual(['instagram', 'tiktok']);
  });

  it('passes through the background site status list', async () => {
    chromeMock.runtime.sendMessage.mockImplementationOnce((_message, callback) => {
      callback?.({ ok: true, data: [INSTAGRAM_STATUS] });
    });

    await expect(getSiteStatuses()).resolves.toEqual([INSTAGRAM_STATUS]);
  });
});
