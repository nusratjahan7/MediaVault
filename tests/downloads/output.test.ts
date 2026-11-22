import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareDownloadOutput } from '@/downloads/output';
import { MEDIA_PROCESSING_ORIGINS } from '@/constants';
import { DEFAULT_SETTINGS } from '@/storage/settings';
import type { DownloadSource } from '@/types/download';
import type { Settings } from '@/types/settings';
import { grantOrigin } from '../mocks/chrome';

const SOURCE: DownloadSource = {
  id: 'instagram_clip',
  platform: 'instagram',
  kind: 'video',
  url: 'https://scontent.cdninstagram.com/sd.mp4',
  author: 'studio',
  formats: [
    {
      id: 'sd',
      label: 'SD',
      extension: 'mp4',
      mimeType: 'video/mp4',
      kind: 'video',
      quality: 'sd',
      url: 'https://scontent.cdninstagram.com/sd.mp4',
    },
    {
      id: 'hd',
      label: 'HD',
      extension: 'mp4',
      mimeType: 'video/mp4',
      kind: 'video',
      quality: 'hd',
      url: 'https://scontent.cdninstagram.com/hd.mp4',
    },
  ],
};

function settings(patch: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...patch };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('download output preferences', () => {
  it('selects the highest exposed video source and reports its quality', async () => {
    const result = await prepareDownloadOutput(SOURCE, settings());

    expect(result.url).toBe('https://scontent.cdninstagram.com/hd.mp4');
    expect(result.extension).toBe('mp4');
    expect(result.quality).toBe('hd');
    expect(result.output.label).toBe('MP4 · HD');
    expect(result.output.converted).toBe(false);
  });

  it('keeps the exact source URL when asked', async () => {
    const result = await prepareDownloadOutput(
      SOURCE,
      settings({ videoQuality: 'source' }),
    );

    expect(result.url).toBe(SOURCE.url);
    expect(result.output.quality).toBe('source');
    expect(result.output.label).toBe('MP4 · Source');
  });

  it('falls back to the original image when conversion access is unavailable', async () => {
    const source: DownloadSource = {
      ...SOURCE,
      kind: 'image',
      url: 'https://scontent.cdninstagram.com/photo.jpg',
      formats: undefined,
    };
    const result = await prepareDownloadOutput(
      source,
      settings({ imageFormat: 'png' }),
    );

    expect(result.url).toBe(source.url);
    expect(result.extension).toBe('jpg');
    expect(result.output.converted).toBe(false);
    expect(result.output.note).toMatch(/media processing access/i);
  });

  it('preserves the original image format by default', async () => {
    const source: DownloadSource = {
      ...SOURCE,
      kind: 'image',
      url: 'https://scontent.cdninstagram.com/photo.webp',
      formats: undefined,
    };
    const result = await prepareDownloadOutput(source, settings());

    expect(result.url).toBe(source.url);
    expect(result.extension).toBe('webp');
    expect(result.output.converted).toBe(false);
  });

  it('supports explicit sidecar output without conversion', async () => {
    const source: DownloadSource = {
      ...SOURCE,
      kind: 'image',
      sidecar: 'caption',
      url: 'data:text/plain;base64,SGVsbG8=',
    };
    const result = await prepareDownloadOutput(source, settings({ imageFormat: 'png' }), {
      extension: 'txt',
      mimeType: 'text/plain',
      quality: 'source',
      label: 'TXT · Caption',
      converted: false,
    });

    expect(result.url).toBe(source.url);
    expect(result.extension).toBe('txt');
    expect(result.output.label).toBe('TXT · Caption');
  });

  it('converts a supported image locally when permission and canvas are available', async () => {
    for (const origin of MEDIA_PROCESSING_ORIGINS) {
      grantOrigin(origin);
    }

    const context = {
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    };
    const convertedBlob = new Blob([new Uint8Array([1, 2, 3])], {
      type: 'image/png',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        blob: async () =>
          new Blob([new Uint8Array([9, 8, 7])], { type: 'image/jpeg' }),
      })),
    );
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({
        width: 2,
        height: 2,
        close: vi.fn(),
      })),
    );
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        width: number;
        height: number;

        constructor(width: number, height: number) {
          this.width = width;
          this.height = height;
        }

        getContext() {
          return context;
        }

        async convertToBlob() {
          return convertedBlob;
        }
      },
    );

    const source: DownloadSource = {
      ...SOURCE,
      kind: 'image',
      url: 'https://scontent.cdninstagram.com/photo.jpg',
      formats: undefined,
    };
    const result = await prepareDownloadOutput(
      source,
      settings({ imageFormat: 'png' }),
    );

    expect(result.output.note).toMatch(/not lossless/i);
    expect(result.url).toMatch(/^data:image\/png;base64,/);
    expect(result.extension).toBe('png');
    expect(result.output.converted).toBe(true);
    expect(result.output.label).toBe('PNG · Converted');
  });
});
