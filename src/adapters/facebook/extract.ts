import type { MediaFormat, MediaItem, ScanLimitation } from '@/types/media';
import { extensionFromUrl, normalizeHttpUrl, safeUrl } from '@/utils/url';
import type { ExtractContext, ExtractResult } from '../types';
import { identifyFacebookAccount } from './account';
import { detectFacebookPageType } from './page-type';
import { postIdFromUrl } from '../shared/metadata';
import {
  addLimitation,
  collectImages,
  collectVideos,
  createMediaItem,
  dedupeMediaItems,
  detectLoginWall,
  detectPrivateContent,
  ogContent,
  trimCaption,
} from '../shared/dom';

const PHOTO_PATH = /^\/(photo|photos)/;
const MAX_SCRIPT_LENGTH = 1_500_000;
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v']);

interface FacebookPostLink {
  postUrl: string;
  postId?: string;
}

function extractCaption(document: Document): string | undefined {
  const node = document.querySelector<HTMLElement>(
    '[data-ad-preview="message"], [data-ad-comet-preview="message"], div[role="article"] [dir="auto"]',
  );

  return trimCaption(
    ogContent(document, 'og:description') ?? node?.textContent ?? undefined,
  );
}

function facebookPublishedAt(document: Document): number | undefined {
  const raw = document.querySelector<HTMLElement>('[data-utime]')?.getAttribute('data-utime');
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed < 1_000_000_000_000 ? parsed * 1000 : parsed;
}

function looksLikeDirectVideoUrl(raw: string): boolean {
  const url = safeUrl(raw);
  if (!url) {
    return false;
  }

  const extension = extensionFromUrl(raw);
  if (extension && VIDEO_EXTENSIONS.has(extension)) {
    return true;
  }

  return /(^|\.)fbcdn\.net$/i.test(url.hostname) && !/\.(html?|php)$/i.test(url.pathname);
}

function decodeEmbeddedString(raw: string): string | undefined {
  try {
    const decoded: unknown = JSON.parse(`"${raw}"`);
    return typeof decoded === 'string' ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function findEmbeddedVideoUrls(document: Document, base: URL): string[] {
  const urls = new Set<string>();
  const patterns = [
    /"hd_src"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"sd_src"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"playable_url_quality_hd"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"playable_url"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"browser_native_hd_url"\s*:\s*"((?:\\.|[^"\\])+)"/g,
    /"browser_native_sd_url"\s*:\s*"((?:\\.|[^"\\])+)"/g,
  ];

  for (const script of document.querySelectorAll('script')) {
    const text = script.textContent;
    if (
      !text ||
      text.length > MAX_SCRIPT_LENGTH ||
      !/(hd_src|sd_src|playable_url|browser_native)/.test(text)
    ) {
      continue;
    }

    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        const decoded = match[1] ? decodeEmbeddedString(match[1]) : undefined;
        const normalized = normalizeHttpUrl(decoded, base.href);
        if (normalized && looksLikeDirectVideoUrl(normalized)) {
          urls.add(normalized);
        }
        if (urls.size >= 6) {
          return [...urls];
        }
      }
    }
  }

  return [...urls];
}

function videoFormats(urls: string[]): MediaFormat[] {
  return urls.map((url, index) => ({
    id: `facebook-video-${index + 1}`,
    label: index === 0 ? 'MP4 · Primary' : 'MP4 · Alternate',
    extension: extensionFromUrl(url) ?? 'mp4',
    mimeType: 'video/mp4',
    kind: 'video',
    quality: index === 0 ? 'source' : 'unknown',
    url,
  }));
}

function mediaLinkFor(element: Element, base: URL): FacebookPostLink | undefined {
  const anchor =
    element.closest<HTMLAnchorElement>(
      'a[href*="/photo"], a[href*="photo.php"], a[href*="/permalink"], a[href*="story.php"]',
    ) ??
    element
      .closest('[role="article"]')
      ?.querySelector<HTMLAnchorElement>(
        'a[href*="/photo"], a[href*="photo.php"], a[href*="/permalink"], a[href*="story.php"]',
      );

  const resolved = normalizeHttpUrl(anchor?.getAttribute('href'), base.href);
  if (!resolved) {
    return undefined;
  }

  const parsed = safeUrl(resolved);
  return {
    postUrl: resolved,
    postId: parsed ? postIdFromUrl('facebook', parsed) : undefined,
  };
}

export function extractFacebook({ document, url }: ExtractContext): ExtractResult {
  const items: MediaItem[] = [];
  const limitations: ScanLimitation[] = [];
  const postUrl = url.toString();
  const pageType = detectFacebookPageType(url);
  const isAlbumPage = pageType === 'album';
  const isVideoPage = pageType === 'video' || pageType === 'reel';
  const account = identifyFacebookAccount(document);
  const author = account?.username ?? account?.displayName;
  const caption = extractCaption(document);
  const publishedAt = facebookPublishedAt(document);

  const ogImage = normalizeHttpUrl(ogContent(document, 'og:image'), url.href) ?? undefined;
  const rawOgVideo =
    normalizeHttpUrl(
      ogContent(document, 'og:video:secure_url') ?? ogContent(document, 'og:video:url'),
      url.href,
    ) ?? normalizeHttpUrl(ogContent(document, 'og:video'), url.href) ?? undefined;
  const directOgVideo =
    rawOgVideo && looksLikeDirectVideoUrl(rawOgVideo) ? rawOgVideo : undefined;
  const embeddedVideos = findEmbeddedVideoUrls(document, url);
  const embeddedFormats = videoFormats(embeddedVideos);

  if (directOgVideo) {
    const formats = videoFormats([
      directOgVideo,
      ...embeddedVideos.filter((videoUrl) => videoUrl !== directOgVideo),
    ]);

    items.push(
      createMediaItem('facebook', 'video', directOgVideo, {
        thumbnailUrl: ogImage,
        postUrl,
        author,
        caption,
        publishedAt,
        formats: formats.length > 0 ? formats : embeddedFormats,
        filenameHint: 'facebook-video',
      }),
    );
  } else if (embeddedVideos.length > 0) {
    items.push(
      createMediaItem('facebook', 'video', embeddedVideos[0]!, {
        thumbnailUrl: ogImage,
        postUrl,
        author,
        caption,
        publishedAt,
        formats: embeddedFormats,
        filenameHint: 'facebook-video',
      }),
    );
  } else if (!isVideoPage && ogImage) {
    items.push(
      createMediaItem('facebook', 'image', ogImage, {
        thumbnailUrl: ogImage,
        postUrl,
        author,
        caption,
        publishedAt,
        filenameHint: isAlbumPage ? 'facebook-album-photo' : 'facebook-photo',
      }),
    );
  }

  if (rawOgVideo && !directOgVideo) {
    addLimitation(limitations, {
      code: 'unsupported-media',
      severity: 'warning',
      message:
        'Facebook exposed a video page link, not a direct media file. Adaptive or page-hosted videos cannot be saved without a direct MP4 source.',
    });
  }

  const imageSelector = isAlbumPage
    ? 'a[href*="/photo"] img, a[href*="photo.php"] img'
    : '[role="article"] img, a[href*="/photo"] img, a[href*="photo.php"] img, div[data-pagelet] img, main img';

  for (const candidate of collectImages(document, url.href, {
    selector: imageSelector,
    minSize: 200,
  })) {
    const link = mediaLinkFor(candidate.element, url);

    items.push(
      createMediaItem('facebook', 'image', candidate.url, {
        thumbnailUrl: candidate.url,
        width: candidate.width,
        height: candidate.height,
        postUrl: link?.postUrl ?? postUrl,
        postId: link?.postId,
        author,
        caption,
        publishedAt,
        filenameHint: isAlbumPage
          ? 'facebook-album-photo'
          : (candidate.alt ?? 'facebook-photo'),
      }),
    );
  }

  let sawBlobVideo = false;

  for (const video of collectVideos(document, url.href)) {
    const link = mediaLinkFor(video.element, url);

    if (video.src) {
      items.push(
        createMediaItem('facebook', 'video', video.src, {
          thumbnailUrl: video.poster,
          width: video.width,
          height: video.height,
          postUrl: link?.postUrl ?? postUrl,
          postId: link?.postId,
          author,
          caption,
          publishedAt,
          filenameHint: 'facebook-video',
        }),
      );
      continue;
    }

    if (video.blob) {
      sawBlobVideo = true;

      if (video.poster) {
        items.push(
          createMediaItem('facebook', 'video', video.poster, {
            thumbnailUrl: video.poster,
            width: video.width,
            height: video.height,
            postUrl: link?.postUrl ?? postUrl,
            postId: link?.postId,
            author,
            caption,
            publishedAt,
            downloadable: false,
            unsupportedReason:
              'Facebook delivers this video as an adaptive stream, which has no direct file link.',
          }),
        );
      }
    }
  }

  if (sawBlobVideo) {
    addLimitation(limitations, {
      code: 'blob-video',
      severity: 'warning',
      message:
        'Facebook often delivers video as an adaptive stream (blob). MediaVault cannot save those streams — directly hosted MP4 videos and photos are supported.',
    });
  }

  if (detectLoginWall(document)) {
    addLimitation(limitations, {
      code: 'login-required',
      severity: 'blocking',
      message:
        'Facebook is asking you to log in. MediaVault only reads media already visible on the page — it never signs in or bypasses access controls.',
    });
  }

  if (detectPrivateContent(document)) {
    addLimitation(limitations, {
      code: 'private-content',
      severity: 'blocking',
      message:
        "This content isn't publicly visible. MediaVault cannot access private or restricted Facebook content.",
    });
  }

  const deduped = dedupeMediaItems(items).map((item) => ({
    ...item,
    publishedAt: item.publishedAt ?? publishedAt,
  }));

  const hasDownloadableVideo = deduped.some(
    (item) => item.kind === 'video' && item.downloadable,
  );

  if (isVideoPage && !hasDownloadableVideo) {
    addLimitation(limitations, {
      code: 'unsupported-media',
      severity: 'warning',
      message:
        'No direct video file was exposed by Facebook. Adaptive/DASH streams and page-only video links cannot be saved.',
    });
  }

  if (isAlbumPage && deduped.some((item) => item.kind === 'image')) {
    addLimitation(limitations, {
      code: 'partial-extraction',
      severity: 'info',
      message:
        'Album downloads include only the photos Facebook has rendered. Scroll to load more album items, then scan again.',
    });
  }

  if (pageType === 'profile' && deduped.length === 0) {
    addLimitation(limitations, {
      code: 'no-media',
      severity: 'info',
      message:
        'No directly accessible profile or page media was found. Open a photo, video, reel, or album, or scroll to load page posts.',
    });
  }

  if (PHOTO_PATH.test(url.pathname) && !isAlbumPage && deduped.length === 0) {
    addLimitation(limitations, {
      code: 'no-media',
      severity: 'info',
      message:
        'The photo on this page may not be publicly visible or may have been removed.',
    });
  }

  if (deduped.length === 0) {
    addLimitation(limitations, {
      code: 'no-media',
      severity: 'info',
      message:
        'No downloadable media was found here. Open a photo, video, reel, or album, or scroll to load more content.',
    });
  }

  return { items: deduped, limitations };
}
