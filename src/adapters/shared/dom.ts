import { MAX_CAPTION_LENGTH, MIN_IMAGE_SIZE } from '@/constants';
import type { MediaItem, MediaKind, ScanLimitation } from '@/types/media';
import type { PlatformId } from '@/types/platform';
import { createMediaId } from '@/utils/id';
import { normalizeHttpUrl } from '@/utils/url';

const UI_IMAGE_PATTERNS: RegExp[] = [
  /\/rsrc\.php/i,
  /\/static\//i,
  /\/emoji\//i,
  /\/emoji\.php/i,
  /\/sprite/i,
  /\/icons?\//i,
  /\/favicon/i,
  /\/images\/ui\//i,
  /^data:/i,
  /^blob:/i,
];

const UI_ALT_PATTERN = /profile picture|avatar|icon|emoji|logo|badge/i;

export interface ImageCandidate {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  element: HTMLImageElement;
}

export interface VideoCandidate {
  src?: string;
  poster?: string;
  blob: boolean;
  width?: number;
  height?: number;
  element: HTMLVideoElement;
}

export function metaContent(document: Document, selector: string): string | undefined {
  const content = document.querySelector<HTMLMetaElement>(selector)?.content?.trim();
  return content || undefined;
}

export function ogContent(document: Document, property: string): string | undefined {
  return (
    metaContent(document, `meta[property="${property}"]`) ??
    metaContent(document, `meta[name="${property}"]`)
  );
}

export function isUiImageUrl(url: string): boolean {
  return UI_IMAGE_PATTERNS.some((pattern) => pattern.test(url));
}

export function largestFromSrcset(srcset: string | null | undefined): string | undefined {
  if (!srcset) {
    return undefined;
  }

  let best: { url: string; weight: number } | undefined;

  for (const candidate of srcset.split(',')) {
    const parts = candidate.trim().split(/\s+/);
    const url = parts[0];
    if (!url) {
      continue;
    }

    const descriptor = parts[1] ?? '';
    let weight = 1;

    if (descriptor.endsWith('w')) {
      weight = Number.parseInt(descriptor, 10) || 1;
    } else if (descriptor.endsWith('x')) {
      weight = (Number.parseFloat(descriptor) || 1) * 1000;
    }

    if (!best || weight > best.weight) {
      best = { url, weight };
    }
  }

  return best?.url;
}

export function imageSource(
  image: HTMLImageElement,
  base: string | URL,
): string | undefined {
  const raw =
    image.currentSrc ||
    largestFromSrcset(image.getAttribute('srcset')) ||
    image.getAttribute('src') ||
    image.src;

  return normalizeHttpUrl(raw, base) ?? undefined;
}

export function collectImages(
  root: ParentNode,
  base: string | URL,
  options: { selector?: string; minSize?: number } = {},
): ImageCandidate[] {
  const selector = options.selector ?? 'img';
  const minSize = options.minSize ?? MIN_IMAGE_SIZE;
  const seen = new Set<string>();
  const candidates: ImageCandidate[] = [];

  for (const image of Array.from(root.querySelectorAll<HTMLImageElement>(selector))) {
    const url = imageSource(image, base);
    if (!url || seen.has(url) || isUiImageUrl(url)) {
      continue;
    }

    const width = image.naturalWidth || image.width || undefined;
    const height = image.naturalHeight || image.height || undefined;

    if ((width !== undefined && width < minSize) || (height !== undefined && height < minSize)) {
      continue;
    }

    const alt = image.alt?.trim() || undefined;
    if (alt && UI_ALT_PATTERN.test(alt)) {
      continue;
    }

    seen.add(url);
    candidates.push({ url, width, height, alt, element: image });
  }

  return candidates;
}

export function collectVideos(root: ParentNode, base: string | URL): VideoCandidate[] {
  const seen = new Set<string>();
  const candidates: VideoCandidate[] = [];

  for (const video of Array.from(root.querySelectorAll<HTMLVideoElement>('video'))) {
    const raw = video.currentSrc || video.getAttribute('src') || video.querySelector('source')?.src;
    const poster = normalizeHttpUrl(video.poster, base) ?? undefined;
    const src = normalizeHttpUrl(raw, base) ?? undefined;
    const width = video.videoWidth || undefined;
    const height = video.videoHeight || undefined;

    if (raw?.startsWith('blob:')) {
      const key = `blob:${poster ?? candidates.length}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      candidates.push({ poster, blob: true, width, height, element: video });
      continue;
    }

    if (!src || seen.has(src)) {
      continue;
    }

    seen.add(src);
    candidates.push({ src, poster, blob: false, width, height, element: video });
  }

  return candidates;
}

export function detectLoginWall(document: Document): boolean {
  if (document.querySelector('input[type="password"]')) {
    return true;
  }

  const text = (document.body?.textContent ?? '').toLowerCase();
  const hasContent = document.querySelectorAll('video, article, [role="article"]').length > 0;

  return (
    !hasContent &&
    /log in to continue|sign up to see|you must log in|log in to see|log in to view/.test(text)
  );
}

export function detectPrivateContent(document: Document): boolean {
  const text = (document.body?.textContent ?? '').toLowerCase();
  return /this account is private|this post is not available|this content isn't available|sorry, this page isn't available|content isn't available right now/.test(
    text,
  );
}

export function createMediaItem(
  platform: PlatformId,
  kind: MediaKind,
  url: string,
  extra: Omit<Partial<MediaItem>, 'id' | 'platform' | 'kind' | 'url'> = {},
): MediaItem {
  return {
    id: createMediaId(platform, url),
    platform,
    kind,
    url,
    downloadable: true,
    ...extra,
  };
}

export function dedupeMediaItems(items: MediaItem[]): MediaItem[] {
  const byId = new Map<string, MediaItem>();

  for (const item of items) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }

    const preferred = !existing.downloadable && item.downloadable ? item : existing;
    const secondary = preferred === item ? existing : item;

    byId.set(item.id, {
      ...secondary,
      ...preferred,
      thumbnailUrl: preferred.thumbnailUrl ?? secondary.thumbnailUrl,
      width: preferred.width ?? secondary.width,
      height: preferred.height ?? secondary.height,
      author: preferred.author ?? secondary.author,
      caption: preferred.caption ?? secondary.caption,
      postUrl: preferred.postUrl ?? secondary.postUrl,
    });
  }

  return [...byId.values()];
}

export function trimCaption(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return undefined;
  }

  return cleaned.length > MAX_CAPTION_LENGTH
    ? `${cleaned.slice(0, MAX_CAPTION_LENGTH).trimEnd()}…`
    : cleaned;
}

export function addLimitation(
  limitations: ScanLimitation[],
  limitation: ScanLimitation,
): void {
  if (limitations.some((entry) => entry.code === limitation.code)) {
    return;
  }

  limitations.push(limitation);
}
