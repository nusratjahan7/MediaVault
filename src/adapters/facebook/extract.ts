import type { MediaItem, ScanLimitation } from '@/types/media';
import { normalizeHttpUrl } from '@/utils/url';
import type { ExtractContext, ExtractResult } from '../types';
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

const VIDEO_PATH = /^\/(watch|reel|videos|video\.php|story\.php)/;
const PHOTO_PATH = /^\/(photo|photos)/;

function extractAuthor(document: Document): string | undefined {
  const articleAuthor = document
    .querySelector<HTMLAnchorElement>(
      'h2 a[role="link"], h3 a[role="link"], strong a[role="link"], [role="article"] h2 a',
    )
    ?.textContent?.trim();

  if (articleAuthor && articleAuthor.length <= 80) {
    return articleAuthor;
  }

  const ogTitle = ogContent(document, 'og:title')?.replace(/\s*[|-]\s*Facebook\s*$/i, '').trim();
  return ogTitle && ogTitle.length <= 80 ? ogTitle : undefined;
}

function extractCaption(document: Document): string | undefined {
  const node = document.querySelector<HTMLElement>(
    '[data-ad-preview="message"], [data-ad-comet-preview="message"], div[role="article"] [dir="auto"]',
  );

  return trimCaption(
    ogContent(document, 'og:description') ?? node?.textContent ?? undefined,
  );
}

export function extractFacebook({ document, url }: ExtractContext): ExtractResult {
  const items: MediaItem[] = [];
  const limitations: ScanLimitation[] = [];
  const postUrl = url.toString();
  const author = extractAuthor(document);
  const caption = extractCaption(document);

  const ogImage = normalizeHttpUrl(ogContent(document, 'og:image'), url.href) ?? undefined;
  const ogVideo =
    normalizeHttpUrl(
      ogContent(document, 'og:video:secure_url') ?? ogContent(document, 'og:video:url'),
      url.href,
    ) ?? normalizeHttpUrl(ogContent(document, 'og:video'), url.href) ?? undefined;

  if (ogVideo) {
    items.push(
      createMediaItem('facebook', 'video', ogVideo, {
        thumbnailUrl: ogImage,
        postUrl,
        author,
        caption,
        filenameHint: 'facebook-video',
      }),
    );
  } else if (ogImage) {
    items.push(
      createMediaItem('facebook', 'image', ogImage, {
        thumbnailUrl: ogImage,
        postUrl,
        author,
        caption,
        filenameHint: 'facebook-photo',
      }),
    );
  }

  for (const candidate of collectImages(
    document,
    url.href,
    {
      selector:
        '[role="article"] img, a[href*="/photo"] img, div[data-pagelet] img, main img',
      minSize: 200,
    },
  )) {
    items.push(
      createMediaItem('facebook', 'image', candidate.url, {
        thumbnailUrl: candidate.url,
        width: candidate.width,
        height: candidate.height,
        postUrl,
        author,
        caption,
        filenameHint: candidate.alt ?? 'facebook-photo',
      }),
    );
  }

  let sawBlobVideo = false;
  for (const video of collectVideos(document, url.href)) {
    if (video.src) {
      items.push(
        createMediaItem('facebook', 'video', video.src, {
          thumbnailUrl: video.poster,
          width: video.width,
          height: video.height,
          postUrl,
          author,
          caption,
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
            postUrl,
            author,
            caption,
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

  const deduped = dedupeMediaItems(items);

  if (VIDEO_PATH.test(url.pathname) && sawBlobVideo) {
    addLimitation(limitations, {
      code: 'unsupported-media',
      severity: 'warning',
      message:
        'Adaptive video streams are not reconstructed. If Facebook exposes a direct MP4 URL on this page, it will appear in the list.',
    });
  }

  if (PHOTO_PATH.test(url.pathname) && deduped.length === 0) {
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
        'No downloadable media was found here. Open a photo or video post, or scroll to load more content.',
    });
  }

  return { items: deduped, limitations };
}
