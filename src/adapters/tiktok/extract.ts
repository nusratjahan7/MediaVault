import type { MediaFormat, MediaItem, ScanLimitation } from '@/types/media';
import { normalizeHttpUrl } from '@/utils/url';
import type { ExtractContext, ExtractResult } from '../types';
import { identifyTikTokAccount } from './account';
import { detectTikTokPageType } from './page-type';
import {
  parseTikTokEmbeddedItems,
  parseTikTokEmbeddedState,
  type TikTokEmbeddedItem,
} from './parse-embedded-state';
import {
  addLimitation,
  collectVideos,
  createMediaItem,
  dedupeMediaItems,
  detectLoginWall,
  detectPrivateContent,
  imageSource,
  ogContent,
  trimCaption,
} from '../shared/dom';

interface TikTokPostMeta {
  postUrl: string;
  postId?: string;
  author?: string;
}

function postMetaFromHref(
  href: string | null | undefined,
  base: URL,
): TikTokPostMeta | undefined {
  const resolved = normalizeHttpUrl(href, base.href);
  if (!resolved) {
    return undefined;
  }

  try {
    const path = new URL(resolved).pathname;
    const match = /^\/@([^/]+)\/(video|photo)\/([^/?#]+)/.exec(path);
    if (!match) {
      return undefined;
    }

    return {
      postUrl: resolved,
      postId: match[3] ? decodeURIComponent(match[3]) : undefined,
      author: match[1] ? decodeURIComponent(match[1]) : undefined,
    };
  } catch {
    return undefined;
  }
}

function postMetaForElement(element: Element, base: URL): TikTokPostMeta | undefined {
  const anchor = element.closest<HTMLAnchorElement>(
    'a[href*="/video/"], a[href*="/photo/"]',
  );
  return postMetaFromHref(anchor?.getAttribute('href'), base);
}

function embeddedPostMeta(
  item: TikTokEmbeddedItem,
  author: string | undefined,
  fallback: string,
): TikTokPostMeta {
  const hasImages = item.imageUrls.length > 0 && !item.videoUrl && !item.downloadUrl;
  const kind = hasImages ? 'photo' : 'video';

  if (item.id && author) {
    return {
      postUrl: `https://www.tiktok.com/@${author}/${kind}/${item.id}`,
      postId: item.id,
      author,
    };
  }

  return { postUrl: fallback, postId: item.id, author };
}

function videoFormats(
  playbackUrl: string | undefined,
  downloadUrl: string | undefined,
): MediaFormat[] {
  const formats: MediaFormat[] = [];

  if (playbackUrl) {
    formats.push({
      id: 'tiktok-playback',
      label: 'MP4 · Playback',
      extension: 'mp4',
      mimeType: 'video/mp4',
      kind: 'video',
      quality: 'source',
      url: playbackUrl,
    });
  }

  if (downloadUrl && downloadUrl !== playbackUrl) {
    formats.push({
      id: 'tiktok-download',
      label: 'MP4 · Download copy',
      extension: 'mp4',
      mimeType: 'video/mp4',
      kind: 'video',
      quality: 'hd',
      url: downloadUrl,
    });
  }

  return formats;
}

function addThumbnail(
  items: MediaItem[],
  thumbnailUrl: string | undefined,
  meta: TikTokPostMeta,
  author: string | undefined,
  caption: string | undefined,
  publishedAt: number | undefined,
): void {
  if (!thumbnailUrl) {
    return;
  }

  items.push(
    createMediaItem('tiktok', 'image', thumbnailUrl, {
      thumbnailUrl,
      postUrl: meta.postUrl,
      postId: meta.postId,
      author: author ?? meta.author,
      caption,
      publishedAt,
      filenameHint: 'tiktok-thumbnail',
    }),
  );
}

export function extractTikTok({ document, url }: ExtractContext): ExtractResult {
  const items: MediaItem[] = [];
  const limitations: ScanLimitation[] = [];
  const postUrl = url.toString();
  const pageType = detectTikTokPageType(url);
  const isProfileSurface =
    pageType === 'profile' || pageType === 'tagged' || pageType === 'saved';
  const isDiscoveryPage = isProfileSurface || pageType === 'feed';
  const account = identifyTikTokAccount(document);
  const pageAuthor = account?.username;
  const pageCaption = trimCaption(ogContent(document, 'og:description'));

  const allEmbedded = isDiscoveryPage
    ? parseTikTokEmbeddedItems(document)
    : [parseTikTokEmbeddedState(document)].filter(
        (item): item is TikTokEmbeddedItem => Boolean(item),
      );
  const embeddedItems =
    pageType === 'profile' && pageAuthor
      ? allEmbedded.filter((item) => !item.author || item.author === pageAuthor)
      : allEmbedded;

  const embeddedPostIds = new Set<string>();
  let sawSlideshow = false;

  for (const item of embeddedItems) {
    const itemAuthor = item.author ?? pageAuthor;
    const caption = trimCaption(item.caption);
    const meta = embeddedPostMeta(item, itemAuthor, postUrl);
    if (item.id) {
      embeddedPostIds.add(item.id);
    }

    const playbackUrl = normalizeHttpUrl(item.videoUrl, url.href) ?? undefined;
    const downloadUrl = normalizeHttpUrl(item.downloadUrl, url.href) ?? undefined;
    const videoUrl = playbackUrl ?? downloadUrl;
    const coverUrl = normalizeHttpUrl(item.coverUrl, url.href) ?? undefined;
    const formats = videoFormats(playbackUrl, downloadUrl);

    if (videoUrl) {
      items.push(
        createMediaItem('tiktok', 'video', videoUrl, {
          thumbnailUrl: coverUrl,
          width: item.width,
          height: item.height,
          durationSeconds: item.durationSeconds,
          postUrl: meta.postUrl,
          postId: meta.postId,
          author: itemAuthor,
          caption,
          publishedAt: item.publishedAt,
          formats,
          filenameHint: item.id ? `tiktok-${item.id}` : 'tiktok-video',
        }),
      );
    }

    for (const imageUrl of item.imageUrls) {
      const normalized = normalizeHttpUrl(imageUrl, url.href);
      if (!normalized) {
        continue;
      }

      items.push(
        createMediaItem('tiktok', 'image', normalized, {
          thumbnailUrl: normalized,
          postUrl: meta.postUrl,
          postId: meta.postId,
          author: itemAuthor,
          caption,
          publishedAt: item.publishedAt,
          filenameHint: 'tiktok-photo',
        }),
      );
    }

    if (item.imageUrls.length > 0) {
      sawSlideshow = true;
    } else if (videoUrl) {
      addThumbnail(items, coverUrl, meta, itemAuthor, caption, item.publishedAt);
    }
  }

  if (sawSlideshow) {
    addLimitation(limitations, {
      code: 'partial-extraction',
      severity: 'info',
      message:
        "Slideshow audio is a separate track, so only the images are downloaded. TikTok's photo images are saved at the resolution the page exposes.",
    });
  }

  let sawBlobVideo = false;

  for (const video of collectVideos(document, url.href)) {
    const linked = postMetaForElement(video.element, url);
    const meta = linked ?? {
      postUrl,
      postId: undefined,
      author: pageAuthor,
    };
    const author = linked?.author ?? pageAuthor;

    if (video.src) {
      items.push(
        createMediaItem('tiktok', 'video', video.src, {
          thumbnailUrl: video.poster,
          width: video.width,
          height: video.height,
          postUrl: meta.postUrl,
          postId: meta.postId,
          author,
          caption: pageCaption,
          publishedAt: embeddedItems[0]?.publishedAt,
          filenameHint: 'tiktok-video',
        }),
      );
      addThumbnail(
        items,
        video.poster,
        meta,
        author,
        pageCaption,
        embeddedItems[0]?.publishedAt,
      );
      continue;
    }

    if (video.blob) {
      sawBlobVideo = true;

      if (video.poster) {
        items.push(
          createMediaItem('tiktok', 'video', meta.postUrl, {
            thumbnailUrl: video.poster,
            width: video.width,
            height: video.height,
            postUrl: meta.postUrl,
            postId: meta.postId,
            author,
            caption: pageCaption,
            publishedAt: embeddedItems[0]?.publishedAt,
            downloadable: false,
            unsupportedReason:
              'TikTok is streaming this video without a direct file link on this page. Open the video itself and scan again.',
          }),
        );
        addThumbnail(
          items,
          video.poster,
          meta,
          author,
          pageCaption,
          embeddedItems[0]?.publishedAt,
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

  let profileVideoCards = 0;

  if (isProfileSurface) {
    const seenLinks = new Set<string>();
    const anchors = document.querySelectorAll<HTMLAnchorElement>(
      'main a[href*="/video/"]',
    );

    for (const anchor of anchors) {
      const linked = postMetaFromHref(anchor.getAttribute('href'), url);
      if (!linked || seenLinks.has(linked.postUrl)) {
        continue;
      }

      if (pageType === 'profile' && pageAuthor && linked.author && linked.author !== pageAuthor) {
        continue;
      }

      seenLinks.add(linked.postUrl);

      const posterImage = anchor.querySelector<HTMLImageElement>('img');
      const poster = posterImage ? imageSource(posterImage, url.href) : undefined;
      const alreadyDiscovered = linked.postId
        ? embeddedPostIds.has(linked.postId)
        : false;

      if (!alreadyDiscovered) {
        items.push(
          createMediaItem('tiktok', 'video', linked.postUrl, {
            thumbnailUrl: poster,
            postUrl: linked.postUrl,
            postId: linked.postId,
            author: linked.author ?? pageAuthor,
            caption: pageCaption,
            downloadable: false,
            unsupportedReason:
              'TikTok exposes direct media only on the video page. Open this video to download it.',
            filenameHint: 'tiktok-video',
          }),
        );
        profileVideoCards += 1;
      }

      addThumbnail(
        items,
        poster,
        linked,
        linked.author ?? pageAuthor,
        pageCaption,
        undefined,
      );
    }
  }

  if (profileVideoCards > 0) {
    addLimitation(limitations, {
      code: 'lazy-loaded',
      severity: 'info',
      message:
        'Profile video cards are links, not direct files. Open a video to load its download source; profile thumbnails can be saved now.',
    });
  }

  const hasVideo = items.some((item) => item.kind === 'video');
  if (!hasVideo) {
    const ogVideo = normalizeHttpUrl(
      ogContent(document, 'og:video:secure_url') ?? ogContent(document, 'og:video'),
      url.href,
    );
    const ogImage = normalizeHttpUrl(ogContent(document, 'og:image'), url.href) ?? undefined;

    if (ogVideo) {
      const meta = postMetaFromHref(ogVideo, url) ?? {
        postUrl,
        postId: undefined,
        author: pageAuthor,
      };
      items.push(
        createMediaItem('tiktok', 'video', ogVideo, {
          thumbnailUrl: ogImage,
          postUrl: meta.postUrl,
          postId: meta.postId,
          author: pageAuthor,
          caption: pageCaption,
          publishedAt: embeddedItems[0]?.publishedAt,
          filenameHint: 'tiktok-video',
        }),
      );
      addThumbnail(
        items,
        ogImage,
        meta,
        pageAuthor,
        pageCaption,
        embeddedItems[0]?.publishedAt,
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

  if (pageType === 'profile' && items.length === 0) {
    addLimitation(limitations, {
      code: 'partial-extraction',
      severity: 'info',
      message:
        'No accessible videos were discovered on this profile. TikTok profile feeds may use streamed previews without direct file links.',
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
