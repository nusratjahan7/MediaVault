import { MIN_IMAGE_SIZE } from '@/constants';
import type { MediaFormat, MediaItem, ScanLimitation } from '@/types/media';
import { isLikelyMediaUrl } from '@/downloads/media-resolver';
import { normalizeHttpUrl } from '@/utils/url';
import type { ExtractContext, ExtractResult } from '../types';
import { identifyInstagramAccount } from './account';
import { findInstagramEmbeddedVideos } from './embedded-video';
import { detectInstagramPageType } from './page-type';
import {
  addLimitation,
  collectImages,
  collectVideos,
  createMediaItem,
  dedupeMediaItems,
  detectLoginWall,
  detectPrivateContent,
  imageSource,
  ogContent,
  trimCaption,
} from '../shared/dom';
import { postIdFromUrl } from '../shared/metadata';

function postLinkFor(element: Element, base: URL): string | undefined {
  const anchor =
    element.closest<HTMLAnchorElement>('a[href*="/p/"], a[href*="/reel/"]') ??
    element
      .closest('article')
      ?.querySelector<HTMLAnchorElement>('a[href*="/p/"], a[href*="/reel/"]');

  return normalizeHttpUrl(anchor?.getAttribute('href'), base.href) ?? undefined;
}

function postMetadata(link: string | undefined, fallback: string) {
  if (!link) {
    return { postUrl: fallback, postId: undefined };
  }

  const parsed = new URL(link);
  return { postUrl: link, postId: postIdFromUrl('instagram', parsed) };
}

function instagramVideoFormats(
  videos: Array<{ url: string; width?: number; height?: number }>,
): MediaFormat[] {
  const seen = new Set<string>();
  const formats: MediaFormat[] = [];

  for (const [index, video] of videos.entries()) {
    if (seen.has(video.url)) {
      continue;
    }

    seen.add(video.url);
    const resolution =
      video.width && video.height
        ? `${Math.min(video.width, video.height)}×${Math.max(video.width, video.height)}`
        : index === 0
          ? 'Best exposed source'
          : 'Alternate source';

    formats.push({
      id: `instagram-video-${index + 1}`,
      label: `MP4 · ${resolution}`,
      extension: 'mp4',
      mimeType: 'video/mp4',
      kind: 'video',
      quality: 'source',
      url: video.url,
    });
  }

  return formats;
}

export function extractInstagram({ document, url }: ExtractContext): ExtractResult {
  const items: MediaItem[] = [];
  const limitations: ScanLimitation[] = [];
  const postUrl = url.toString();
  const pageType = detectInstagramPageType(url);
  const isPostPage =
    pageType === 'post' || pageType === 'reel' || pageType === 'video';
  const isStoryPage = pageType === 'story' || pageType === 'highlight';
  const author = identifyInstagramAccount(document)?.username;
  const caption = trimCaption(
    ogContent(document, 'og:description') ?? ogContent(document, 'description'),
  );

  const ogImage = normalizeHttpUrl(ogContent(document, 'og:image'), url.href) ?? undefined;
  const rawOgVideo =
    normalizeHttpUrl(
      ogContent(document, 'og:video:secure_url') ?? ogContent(document, 'og:video'),
      url.href,
    ) ?? undefined;
  const ogVideo =
    rawOgVideo && isLikelyMediaUrl(rawOgVideo, 'video') ? rawOgVideo : undefined;
  const canUseEmbeddedVideo =
    isStoryPage ||
    pageType === 'reel' ||
    pageType === 'video' ||
    Boolean(rawOgVideo) ||
    Boolean(document.querySelector('article video, main video'));
  const embeddedVideos = canUseEmbeddedVideo
    ? findInstagramEmbeddedVideos(document, url)
    : [];
  const videoCandidates: Array<{
    url: string;
    width?: number;
    height?: number;
  }> = [
    ...(ogVideo ? [{ url: ogVideo }] : []),
    ...embeddedVideos,
  ].filter(
    (video, index, all) =>
      all.findIndex((candidate) => candidate.url === video.url) === index,
  );
  const videoFormats = instagramVideoFormats(videoCandidates);
  const primaryVideo = videoCandidates[0];

  if (pageType === 'profile') {
    const profileImage = document.querySelector<HTMLImageElement>(
      'header img[alt*="profile picture" i], header img[alt*="profile photo" i], main img[alt*="profile picture" i], main img[alt*="profile photo" i]',
    );
    const profileUrl =
      (profileImage ? imageSource(profileImage, url.href) : undefined) ??
      ogImage ??
      undefined;

    if (profileUrl) {
      items.push(
        createMediaItem('instagram', 'image', profileUrl, {
          thumbnailUrl: profileUrl,
          width: profileImage?.naturalWidth || profileImage?.width || undefined,
          height: profileImage?.naturalHeight || profileImage?.height || undefined,
          postUrl,
          author,
          caption: 'Profile picture',
          filenameHint: 'instagram-profile-picture',
        }),
      );
    }
  }

  if (primaryVideo) {
    items.push(
      createMediaItem('instagram', 'video', primaryVideo.url, {
        thumbnailUrl: ogImage,
        width: primaryVideo.width,
        height: primaryVideo.height,
        postUrl,
        author,
        caption,
        formats: videoFormats,
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

  if (rawOgVideo && !ogVideo && videoCandidates.length === 0) {
    addLimitation(limitations, {
      code: 'unsupported-media',
      severity: 'warning',
      message:
        'Instagram exposed a page link instead of a direct video file. Adaptive/segmented video cannot be saved without a permitted direct source.',
    });
  }

  let linkedGridImages = 0;
  const imageSelector = isStoryPage
    ? '[role="dialog"] img, main img, section img'
    : 'article img, main img, a[href*="/p/"] img, a[href*="/reel/"] img';

  for (const candidate of collectImages(document, url.href, {
    selector: imageSelector,
    minSize: MIN_IMAGE_SIZE,
  })) {
    const linked = postLinkFor(candidate.element, url);
    if (linked) {
      linkedGridImages += 1;
    }

    const meta = postMetadata(linked, postUrl);

    items.push(
      createMediaItem('instagram', 'image', candidate.url, {
        thumbnailUrl: candidate.url,
        width: candidate.width,
        height: candidate.height,
        postUrl: meta.postUrl,
        postId: meta.postId,
        author,
        caption,
        filenameHint: linked
          ? 'instagram-grid-image'
          : (candidate.alt ?? 'instagram-photo'),
      }),
    );
  }

  for (const video of collectVideos(document, url.href)) {
    const linked = postLinkFor(video.element, url);
    const meta = postMetadata(linked, postUrl);

    if (video.src) {
      items.push(
        createMediaItem('instagram', 'video', video.src, {
          thumbnailUrl: video.poster,
          width: video.width,
          height: video.height,
          postUrl: meta.postUrl,
          postId: meta.postId,
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
            postUrl: meta.postUrl,
            postId: meta.postId,
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

  if (linkedGridImages > 0 && !isPostPage) {
    addLimitation(limitations, {
      code: 'partial-extraction',
      severity: 'info',
      message:
        'Profile-grid downloads save the image Instagram renders in the grid. Open a post to save its original media and all carousel slides.',
    });
  }

  if (isStoryPage && deduped.length === 0) {
    addLimitation(limitations, {
      code: 'unsupported-media',
      severity: 'warning',
      message:
        'This story or highlight does not expose a direct media file. MediaVault does not bypass login, private-account, or access restrictions.',
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
