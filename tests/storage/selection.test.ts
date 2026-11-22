import { describe, expect, it } from 'vitest';
import {
  clearTabSelection,
  getTabSelection,
  saveTabSelection,
} from '@/storage/selection';
import type { MediaItem } from '@/types/media';

const ITEM: MediaItem = {
  id: 'tiktok_one',
  platform: 'tiktok',
  kind: 'video',
  url: 'https://v16.tiktokcdn.com/one.mp4',
  thumbnailUrl: 'https://p16.tiktokcdn.com/one.jpg',
  author: 'creator',
  caption: 'First video',
  downloadable: true,
};

describe('selection persistence', () => {
  it('stores selection per tab and clears it', async () => {
    await saveTabSelection(1, 'tiktok', [ITEM]);

    await expect(getTabSelection(1)).resolves.toEqual([ITEM]);
    await expect(getTabSelection(2)).resolves.toEqual([]);

    await clearTabSelection(1);
    await expect(getTabSelection(1)).resolves.toEqual([]);
  });

  it('removes storage when the selection is empty', async () => {
    await saveTabSelection(3, 'instagram', [ITEM]);
    await saveTabSelection(3, 'instagram', []);

    await expect(getTabSelection(3)).resolves.toEqual([]);
  });

  it('ignores malformed or non-media stored values', async () => {
    await chrome.storage.session.set({
      'mediavault:selection:v1:4': {
        version: 1,
        platform: 'tiktok',
        items: [{ id: 'not-media' }],
        updatedAt: 1,
      },
    });

    await expect(getTabSelection(4)).resolves.toEqual([]);
  });
});
