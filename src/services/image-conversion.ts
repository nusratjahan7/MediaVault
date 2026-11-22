import { MEDIA_PROCESSING_ORIGINS } from '@/constants';
import type { ImageFormatPreference } from '@/types/settings';

export interface ImageTargetFormat {
  preference: Exclude<ImageFormatPreference, 'original'>;
  extension: 'jpg' | 'png' | 'webp';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ConvertedImage {
  dataUrl: string;
  extension: ImageTargetFormat['extension'];
  mimeType: ImageTargetFormat['mimeType'];
}

const TARGETS: Record<Exclude<ImageFormatPreference, 'original'>, ImageTargetFormat> = {
  jpeg: {
    preference: 'jpeg',
    extension: 'jpg',
    mimeType: 'image/jpeg',
  },
  png: {
    preference: 'png',
    extension: 'png',
    mimeType: 'image/png',
  },
  webp: {
    preference: 'webp',
    extension: 'webp',
    mimeType: 'image/webp',
  },
};

const CONVERTIBLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);

export function imageTargetForPreference(
  preference: ImageFormatPreference,
): ImageTargetFormat | null {
  return preference === 'original' ? null : TARGETS[preference];
}

export function isConvertibleImage(extension: string): boolean {
  return CONVERTIBLE_EXTENSIONS.has(extension.toLowerCase());
}

export function isLocalImageConversionAvailable(): boolean {
  return typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function';
}

export async function convertImageToFormat(
  url: string,
  target: ImageTargetFormat,
): Promise<ConvertedImage> {
  const granted = await chrome.permissions.contains({
    origins: MEDIA_PROCESSING_ORIGINS,
  }).catch(() => false);

  if (!granted) {
    throw new Error(
      'Image conversion needs media processing access. Allow it in Settings → Format & quality, or save the original.',
    );
  }

  if (!isLocalImageConversionAvailable()) {
    throw new Error('Local image conversion is unavailable in this browser.');
  }

  const response = await fetch(url, {
    credentials: 'omit',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`The image could not be read for conversion (${response.status}).`);
  }

  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('The local image canvas could not be created.');
    }

    if (target.mimeType === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(bitmap, 0, 0);

    const converted = await canvas.convertToBlob({
      type: target.mimeType,
      quality: 0.92,
    });
    const dataUrl = await blobToDataUrl(converted);

    return {
      dataUrl,
      extension: target.extension,
      mimeType: target.mimeType,
    };
  } finally {
    bitmap.close();
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = await readBlobBytes(blob);
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`;
}

async function readBlobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer());
  }

  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The image data could not be read.'));
      reader.onload = () => {
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  throw new Error('The image data could not be read in this browser.');
}

export function textDataUrl(
  content: string,
  mimeType = 'text/plain',
): string {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return `data:${mimeType};charset=utf-8;base64,${btoa(binary)}`;
}
