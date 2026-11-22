import { MIN_IMAGE_SIZE } from '@/constants';
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

const POST_PATH = /^\/(p|reel|reels|tv)\//;

function extractAuthor(document: Document): string | undefined {
  const ogTitle = ogContent(document, 'og:title');
  const titleMatch = ogTitle?.match(/\(@([A-Za-z0-9._]+)\)/);
  if (titleMatch?.[1]) {
    return titleMatch[1];
  }

  const twitterCreator = document
    .querySelector<HTMLMetaElement>('meta[name="twitter:creator"]')
    ?.content?.trim();
  if (twitterCreator) {
    return twitterCreator.replace(/^@/, '');
  }

  const href = document
    .querySelector<HTMLAnchorElement>('article header a[href^="/"], main header a[href^="/"]')
    ?.getAttribute('href');
  const username = href?.split('/').filter(Boolean)[0];

  if (
    username &&
    !['explore', 'reels', 'stories', 'accounts', 'direct', 'p', 'reel'].includes(username)
  ) {
    return username;
  }

  return undefined;
}

export function extractInstagram({ document, url }: ExtractContext): ExtractResult {
  const items: MediaItem[] = [];
  const limitations: ScanLimitation[] = [];
  const postUrl = url.toString();
  const isPostPage = POST_PATH.test(url.pathname);
  const author = extractAuthor(document);
  const caption = trimCaption(
    ogContent(document, 'og:description') ?? ogContent(document, 'description'),
  );

  const ogImage = normalizeHttpUrl(ogContent(document, 'og:image'), url.href) ?? undefined;
  const ogVideo =
    normalizeHttpUrl(
      ogContent(document, 'og:video:secure_url') ?? ogContent(document, 'og:video'),
      url.href,
    ) ?? undefined;

  if (ogVideo) {
    items.push(
      createMediaItem('instagram', 'video', ogVideo, {
        thumbnailUrl: ogImage,
        postUrl,
        author,
        caption,
        filenameHint: 'instagram-video',
      }),
    );
  } else if (ogImage && isPostPage) {
    items.push(
      createMediaItem('instagram', 'image', ogImage, {
        thumbnailUrl: ogImage,
        postUrl,
        author,
        caption,
        filenameHint: 'instagram-photo',
      }),
    );
  }

  for (const candidate of collectImages(document, url.href, {
    selector: 'article img, main img',
    minSize: MIN_IMAGE_SIZE,
  })) {
    items.push(
      createMediaItem('instagram', 'image', candidate.url, {
        thumbnailUrl: candidate.url,
        width: candidate.width,
        height: candidate.height,
        postUrl,
        author,
        caption,
        filenameHint: candidate.alt ?? 'instagram-photo',
      }),
    );
  }

  for (const video of collectVideos(document, url.href)) {
    if (video.src) {
      items.push(
        createMediaItem('instagram', 'video', video.src, {
          thumbnailUrl: video.poster,
          width: video.width,
          height: video.height,
          postUrl,
          author,
          caption,
          filenameHint: 'instagram-video',
        }),
      );
      continue;
    }

    if (video.blob) {
      addLimitation(limitations, {
        code: 'blob-video',
        severity: 'warning',
        message:
          'Some Instagram videos are streamed in segments and cannot be saved directly. Only media with a direct file link is supported.',
      });

      if (video.poster) {
        items.push(
          createMediaItem('instagram', 'video', video.poster, {
            thumbnailUrl: video.poster,
            width: video.width,
            height: video.height,
            postUrl,
            author,
            caption,
            downloadable: false,
            unsupportedReason: 'This video is streamed in segments and has no direct file link.',
          }),
        );
      }
    }
  }

  if (detectLoginWall(document)) {
    addLimitation(limitations, {
      code: 'login-required',
      severity: 'blocking',
      message:
        'Instagram is asking you to log in. MediaVault only reads media already visible on the page — it never signs in or bypasses access controls.',
    });
  }

  if (detectPrivateContent(document)) {
    addLimitation(limitations, {
      code: 'private-content',
      severity: 'blocking',
      message:
        "This account or post isn't publicly visible. MediaVault cannot access private or restricted content.",
    });
  }

  const deduped = dedupeMediaItems(items);

  if (isPostPage && deduped.filter((item) => item.kind === 'image').length > 1) {
    addLimitation(limitations, {
      code: 'partial-extraction',
      severity: 'info',
      message:
        'Carousels only include slides that Instagram has rendered. Scroll through the post to load every slide, then scan again.',
    });
  }

  if (deduped.length === 0) {
    addLimitation(limitations, {
      code: 'no-media',
      severity: 'info',
      message:
        'No downloadable media was found here. Open a post or reel, or scroll to load more content.',
    });
  }

  return { items: deduped, limitations };
}
