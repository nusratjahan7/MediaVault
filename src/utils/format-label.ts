import type { MediaFormat, MediaQuality } from '@/types/media';

export function qualityLabel(quality: MediaQuality | undefined): string {
  switch (quality) {
    case 'hd':
      return 'HD';
    case 'sd':
      return 'SD';
    case 'source':
      return 'Source';
    default:
      return 'Unknown';
  }
}

export function formatOutputLabel(
  extension: string,
  quality: MediaQuality | undefined,
  converted = false,
): string {
  const ext = extension.replace(/^\./, '').toUpperCase();

  if (converted) {
    return `${ext} · Converted`;
  }

  return `${ext} · ${qualityLabel(quality)}`;
}

export function sourceFormatLabel(format: MediaFormat | undefined): string | undefined {
  if (!format) {
    return undefined;
  }

  return formatOutputLabel(format.extension, format.quality ?? 'source');
}
