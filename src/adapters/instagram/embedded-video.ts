import { isLikelyMediaUrl } from '@/downloads/media-resolver';
import { normalizeHttpUrl } from '@/utils/url';

const MAX_SCRIPT_LENGTH = 2_000_000;

export interface InstagramEmbeddedVideo {
  url: string;
  width?: number;
  height?: number;
}

function decodeJsString(raw: string): string | undefined {
  try {
    const decoded: unknown = JSON.parse(`"${raw}"`);
    return typeof decoded === 'string' ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function toPositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

function addVideo(
  videos: InstagramEmbeddedVideo[],
  seen: Set<string>,
  rawUrl: string | undefined,
  width?: number,
  height?: number,
  base?: string,
): void {
  const url = normalizeHttpUrl(rawUrl, base);
  if (!url || seen.has(url) || !isLikelyMediaUrl(url, 'video')) {
    return;
  }

  seen.add(url);
  videos.push({ url, width, height });
}

function parseVideoVersions(
  text: string,
  base: string,
  videos: InstagramEmbeddedVideo[],
  seen: Set<string>,
): void {
  const pattern = /"video_versions"\s*:\s*(\[[\s\S]*?\])/g;

  for (const match of text.matchAll(pattern)) {
    if (!match[1]) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(match[1]);
      if (!Array.isArray(parsed)) {
        continue;
      }

      for (const entry of parsed) {
        if (typeof entry !== 'object' || entry === null) {
          continue;
        }

        const record = entry as Record<string, unknown>;
        const url =
          typeof record.url === 'string'
            ? record.url
            : typeof record.src === 'string'
              ? record.src
              : undefined;

        addVideo(
          videos,
          seen,
          url,
          toPositiveNumber(record.width),
          toPositiveNumber(record.height),
          base,
        );
      }
    } catch {
      // A different script shape may still be caught by the URL fallbacks.
    }
  }
}

function parseEmbeddedStringUrls(
  text: string,
  base: string,
  videos: InstagramEmbeddedVideo[],
  seen: Set<string>,
): void {
  const patterns = [
    /"playable_url_quality_hd"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"playable_url"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"video_url"\s*:\s*"((?:\\.|[^"\\])+)"/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const decoded = match[1] ? decodeJsString(match[1]) : undefined;
      addVideo(videos, seen, decoded, undefined, undefined, base);
    }
  }
}

function parseRawMp4Urls(
  text: string,
  base: string,
  videos: InstagramEmbeddedVideo[],
  seen: Set<string>,
): void {
  const pattern = /https?:\\?\/\\?\/[^"'\\\s]+\.mp4(?:\?[^"'\\\s]*)?/gi;

  for (const match of text.matchAll(pattern)) {
    addVideo(
      videos,
      seen,
      match[0]?.replace(/\\\//g, '/'),
      undefined,
      undefined,
      base,
    );
  }
}

/**
 * Reads only direct video URLs already embedded in the current public page.
 * The caller restricts this to a single post/reel/story surface so it cannot
 * attach an unrelated feed video to a clicked item.
 */
export function findInstagramEmbeddedVideos(
  document: Document,
  base: URL,
): InstagramEmbeddedVideo[] {
  const videos: InstagramEmbeddedVideo[] = [];
  const seen = new Set<string>();

  for (const script of document.querySelectorAll('script')) {
    const text = script.textContent;
    if (!text || text.length > MAX_SCRIPT_LENGTH) {
      continue;
    }

    if (!/(video_versions|playable_url|video_url|\.mp4)/.test(text)) {
      continue;
    }

    parseVideoVersions(text, base.href, videos, seen);
    parseEmbeddedStringUrls(text, base.href, videos, seen);
    parseRawMp4Urls(text, base.href, videos, seen);

    if (videos.length >= 8) {
      break;
    }
  }

  return videos
    .sort((a, b) => (b.height ?? 0) * (b.width ?? 0) - (a.height ?? 0) * (a.width ?? 0))
    .slice(0, 8);
}
