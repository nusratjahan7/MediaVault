import { describe, expect, it } from 'vitest';
import {
  clearDownloadMemory,
  downloadFingerprint,
  hasDownloadedFingerprint,
  markDownloadedFingerprint,
} from '@/storage/download-memory';
import type { DownloadSource } from '@/types/download';

const SOURCE: DownloadSource = {
  id: 'instagram_abc12345',
  platform: 'instagram',
  kind: 'video',
  url: 'https://cdn.example.com/clip.mp4',
  postId: 'ABC123',
};

describe('download memory', () => {
  it('remembers completed media fingerprints without storing URLs', async () => {
    expect(downloadFingerprint(SOURCE)).toBe('instagram:ABC123:video');
    await expect(hasDownloadedFingerprint(SOURCE)).resolves.toBe(false);

    await markDownloadedFingerprint(SOURCE);
    await expect(hasDownloadedFingerprint(SOURCE)).resolves.toBe(true);

    const stored = await chrome.storage.local.get('mediavault:download-memory:v1');
    expect(JSON.stringify(stored)).not.toContain('cdn.example.com');
  });

  it('clears remembered media', async () => {
    await markDownloadedFingerprint(SOURCE);
    await clearDownloadMemory();
    await expect(hasDownloadedFingerprint(SOURCE)).resolves.toBe(false);
  });
});
