import type { MediaItem, ScanLimitation } from '@/types/media';
import { normalizeHttpUrl } from '@/utils/url';
import type { ExtractContext, ExtractResult } from '../types';
import {
  addLimitation,
  collectVideos,
  createMediaItem,
  dedupeMediaItems,
  detectLoginWall,
  detectPrivateContent,
  ogContent,
  trimCaption,
} from '../shared/dom';
import { parseTikTokEmbeddedState } from './parse-embedded-state';

const PROFILE_PATH = /^\/@[^/]+\/?$/;

export function extractTikTok({ document, url }: ExtractContext): ExtractResult {
  const items: MediaItem[] = [];
  const limitations: ScanLimitation[] = [];
  const postUrl = url.toString();
  const embedded = parseTikTokEmbeddedState(document);
  const author = embedded?.author;
  const caption = trimCaption(embedded?.caption);

  if (embedded) {
    const videoUrl = normalizeHttpUrl(embedded.videoUrl ?? embedded.downloadUrl, url.href);
    const coverUrl = normalizeHttpUrl(embedded.coverUrl, url.href) ?? undefined;

    if (videoUrl) {
      items.push(
        createMediaItem('tiktok', 'video', videoUrl, {
          thumbnailUrl: coverUrl,
          width: embedded.width,
          height: embedded.height,
          durationSeconds: embedded.durationSeconds,
          postUrl,
          author,
          caption,
          filenameHint: embedded.id ? `tiktok-${embedded.id}` : 'tiktok-video',
        }),
      );
    }

    for (const imageUrl of embedded.imageUrls) {
      const normalized = normalizeHttpUrl(imageUrl, url.href);
      if (!normalized) {
        continue;
      }

      items.push(
        createMediaItem('tiktok', 'image', normalized, {
          thumbnailUrl: normalized,
          postUrl,
          author,
          caption,
          filenameHint: 'tiktok-photo',
        }),
      );
    }

    if (embedded.imageUrls.length > 0) {
      addLimitation(limitations, {
        code: 'partial-extraction',
        severity: 'info',
        message:
          "Slideshow audio is a separate track, so only the images are downloaded. TikTok's photo images are saved at the resolution the page exposes.",
      });
    }
  }

  let sawBlobVideo = false;
  for (const video of collectVideos(document, url.href)) {
    if (video.src) {
      items.push(
        createMediaItem('tiktok', 'video', video.src, {
          thumbnailUrl: video.poster,
          width: video.width,
          height: video.height,
          postUrl,
          author,
          caption,
          filenameHint: 'tiktok-video',
        }),
      );
      continue;
    }

    if (video.blob) {
      sawBlobVideo = true;

      if (video.poster) {
        items.push(
          createMediaItem('tiktok', 'video', video.poster, {
            thumbnailUrl: video.poster,
            width: video.width,
            height: video.height,
            postUrl,
            author,
            caption,
            downloadable: false,
            unsupportedReason:
              'TikTok is streaming this video without a direct file link on this page.',
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
        'This TikTok video is playing from a streamed blob with no direct file link. Open the video itself so MediaVault can read its public page data.',
    });
  }

  const hasVideo = items.some((item) => item.kind === 'video');
  if (!hasVideo) {
    const ogVideo = normalizeHttpUrl(
      ogContent(document, 'og:video:secure_url') ?? ogContent(document, 'og:video'),
      url.href,
    );

    if (ogVideo) {
      items.push(
        createMediaItem('tiktok', 'video', ogVideo, {
          thumbnailUrl: normalizeHttpUrl(ogContent(document, 'og:image'), url.href) ?? undefined,
          postUrl,
          author,
          caption,
          filenameHint: 'tiktok-video',
        }),
      );
    }
  }

  if (detectLoginWall(document)) {
    addLimitation(limitations, {
      code: 'login-required',
      severity: 'blocking',
      message:
        'TikTok is asking you to log in. MediaVault only reads media already visible on the page — it never signs in or bypasses access controls.',
    });
  }

  if (detectPrivateContent(document)) {
    addLimitation(limitations, {
      code: 'private-content',
      severity: 'blocking',
      message:
        "This content isn't publicly visible. MediaVault cannot access private or restricted TikTok content.",
    });
  }

  if (PROFILE_PATH.test(url.pathname) && items.length === 0) {
    addLimitation(limitations, {
      code: 'partial-extraction',
      severity: 'info',
      message:
        'TikTok profile feeds use streamed previews without direct file links. Open an individual video to save it.',
    });
  }

  const deduped = dedupeMediaItems(items);

  if (deduped.length > 0) {
    addLimitation(limitations, {
      code: 'signed-url-expiry',
      severity: 'info',
      message:
        'TikTok media links expire after a short time. Download while this page is still open; scan again if a link stops working.',
    });
  } else {
    addLimitation(limitations, {
      code: 'no-media',
      severity: 'info',
      message:
        'No downloadable media was found here. Open a TikTok video or photo post, then scan again.',
    });
  }

  return { items: deduped, limitations };
}
