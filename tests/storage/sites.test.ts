import { describe, expect, it } from 'vitest';
import { SITES_STORAGE_KEY } from '@/constants';
import {
  addEnabledSite,
  getEnabledSites,
  removeEnabledSite,
  setEnabledSites,
} from '@/storage/sites';

describe('site access storage', () => {
  it('starts with no enabled sites', async () => {
    await expect(getEnabledSites()).resolves.toEqual([]);
  });

  it('adds sites uniquely', async () => {
    await addEnabledSite('instagram');
    await addEnabledSite('instagram');
    await addEnabledSite('tiktok');

    await expect(getEnabledSites()).resolves.toEqual(['instagram', 'tiktok']);
  });

  it('removes sites', async () => {
    await setEnabledSites(['instagram', 'facebook']);
    await removeEnabledSite('instagram');

    await expect(getEnabledSites()).resolves.toEqual(['facebook']);
  });

  it('ignores malformed stored values', async () => {
    await chrome.storage.local.set({
      [SITES_STORAGE_KEY]: { version: 1, platforms: ['instagram', 'myspace', 42] },
    });

    await expect(getEnabledSites()).resolves.toEqual(['instagram']);
  });

  it('drops unknown platforms when writing', async () => {
    await setEnabledSites(['instagram', 'myspace' as never]);

    await expect(getEnabledSites()).resolves.toEqual(['instagram']);
  });
});
