import { describe, expect, it } from 'vitest';
import { buildCaptionExport } from '@/utils/export';

describe('caption export', () => {
  it('formats caption, account, and source URL', () => {
    expect(
      buildCaptionExport({
        caption: '  A quiet morning.  ',
        author: '@studio.north',
        sourceUrl: 'https://www.instagram.com/p/ABC123/',
      }),
    ).toBe(
      'A quiet morning.\n\nAccount: @studio.north\nSource: https://www.instagram.com/p/ABC123/',
    );
  });

  it('still exports available metadata when the caption is missing', () => {
    expect(
      buildCaptionExport({
        author: 'studio.north',
        sourceUrl: 'https://www.instagram.com/p/ABC123/',
      }),
    ).toBe(
      'Account: @studio.north\nSource: https://www.instagram.com/p/ABC123/',
    );
  });

  it('returns a clear fallback when nothing is available', () => {
    expect(buildCaptionExport({})).toBe('No caption or source URL is available.');
  });
});
