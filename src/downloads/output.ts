import type {
  DownloadOutputInfo,
  DownloadSource,
} from '@/types/download';
import type { MediaFormat, MediaQuality } from '@/types/media';
import type { Settings } from '@/types/settings';
import {
  convertImageToFormat,
  imageTargetForPreference,
  isConvertibleImage,
} from '@/services/image-conversion';
import { formatOutputLabel } from '@/utils/format-label';
import { extensionFromUrl, isHttpUrl } from '@/utils/url';

export interface PreparedDownloadOutput {
  url: string;
  extension: string;
  mimeType: string;
  quality: MediaQuality;
  output: DownloadOutputInfo;
}

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  txt: 'text/plain',
  json: 'application/json',
};

function normalizeExtension(
  extension: string | null | undefined,
  fallback: string,
): string {
  const value = (extension ?? '').replace(/^\./, '').toLowerCase();
  if (!value) {
    return fallback;
  }

  return value === 'jpeg' ? 'jpg' : value;
}

function baseFormat(
  source: DownloadSource,
  settings: Settings,
): {
  url: string;
  extension: string;
  mimeType: string;
  quality: MediaQuality;
  label?: string;
} {
  const fallbackExtension = normalizeExtension(
    extensionFromUrl(source.url),
    source.kind === 'video' ? 'mp4' : 'jpg',
  );

  if (source.kind !== 'video' || settings.videoQuality === 'source') {
    return {
      url: source.url,
      extension: fallbackExtension,
      mimeType: MIME_BY_EXTENSION[fallbackExtension] ?? (source.kind === 'video' ? 'video/mp4' : 'image/jpeg'),
      quality: 'source',
    };
  }

  const formats = (source.formats ?? []).filter(
    (format): format is MediaFormat & { url: string } =>
      Boolean(format.url) && isHttpUrl(format.url ?? '') && format.kind === 'video',
  );

  if (formats.length === 0) {
    return {
      url: source.url,
      extension: fallbackExtension,
      mimeType: MIME_BY_EXTENSION[fallbackExtension] ?? 'video/mp4',
      quality: 'source',
    };
  }

  const selected = [...formats].sort((a, b) => formatScore(b) - formatScore(a))[0]!;
  const extension = normalizeExtension(
    selected.extension || extensionFromUrl(selected.url),
    'mp4',
  );

  return {
    url: selected.url,
    extension,
    mimeType: selected.mimeType || MIME_BY_EXTENSION[extension] || 'video/mp4',
    quality: selected.quality ?? 'source',
    label: selected.label,
  };
}

function formatScore(format: MediaFormat): number {
  const qualityScore =
    format.quality === 'source'
      ? 4
      : format.quality === 'hd'
        ? 3
        : format.quality === 'sd'
          ? 2
          : 1;
  const resolution = format.label.match(/(\d{3,4})p/i)?.[1];
  return qualityScore * 1_000_000 + (resolution ? Number(resolution) : 0);
}

function outputInfo(
  extension: string,
  mimeType: string,
  quality: MediaQuality,
  converted = false,
  note?: string,
): DownloadOutputInfo {
  return {
    extension,
    mimeType,
    quality,
    label: formatOutputLabel(extension, quality, converted),
    converted,
    ...(note ? { note } : {}),
  };
}

export async function prepareDownloadOutput(
  source: DownloadSource,
  settings: Settings,
  explicitOutput?: DownloadOutputInfo,
): Promise<PreparedDownloadOutput> {
  if (explicitOutput) {
    return {
      url: source.url,
      extension: explicitOutput.extension,
      mimeType: explicitOutput.mimeType,
      quality: explicitOutput.quality,
      output: explicitOutput,
    };
  }

  const base = baseFormat(source, settings);
  const baseOutput = outputInfo(base.extension, base.mimeType, base.quality);

  if (
    source.kind !== 'image' ||
    source.sidecar ||
    settings.imageFormat === 'original'
  ) {
    return {
      url: base.url,
      ...baseOutput,
      output: baseOutput,
    };
  }

  const target = imageTargetForPreference(settings.imageFormat);

  if (!target) {
    return {
      url: base.url,
      ...baseOutput,
      output: baseOutput,
    };
  }

  if (normalizeExtension(base.extension, 'jpg') === target.extension) {
    return {
      url: base.url,
      ...baseOutput,
      output: {
        ...baseOutput,
        note: `Already ${target.extension.toUpperCase()}; the original file was kept.`,
      },
    };
  }

  if (!isConvertibleImage(base.extension)) {
    return {
      url: base.url,
      ...baseOutput,
      output: {
        ...baseOutput,
        note: `Conversion to ${target.extension.toUpperCase()} is not supported for this image type; the original was kept.`,
      },
    };
  }

  try {
    const converted = await convertImageToFormat(base.url, target);
    const note = 'Converted locally by decoding and re-encoding the image; not lossless.';

    return {
      url: converted.dataUrl,
      extension: converted.extension,
      mimeType: converted.mimeType,
      quality: 'source',
      output: outputInfo(converted.extension, converted.mimeType, 'source', true, note),
    };
  } catch (error) {
    return {
      url: base.url,
      ...baseOutput,
      output: {
        ...baseOutput,
        note: `${error instanceof Error ? error.message : 'Image conversion failed.'} The original was kept.`,
      },
    };
  }
}
