import type { InPageActionTarget } from '@/types/in-page';
import type { PageType } from '@/types/page';
import { normalizeHttpUrl } from '@/utils/url';
import { detectLoginWall, detectPrivateContent, imageSource } from '../shared/dom';
import { detectInstagramPageType } from './page-type';

export type InstagramActionKind = 'post' | 'grid' | 'story' | 'profile-picture';
export type InstagramActionTarget = InPageActionTarget & {
  kind: InstagramActionKind;
};

function findPostUrl(scope: ParentNode, base: URL): string | undefined {
  const anchor = scope.querySelector<HTMLAnchorElement>(
    'a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]',
  );
  return normalizeHttpUrl(anchor?.getAttribute('href'), base.href) ?? undefined;
}

function isActionGroup(element: HTMLElement): boolean {
  const actions = element.querySelectorAll('button, [role="button"], a[role="button"]');
  return actions.length >= 2 && actions.length <= 12 && Boolean(element.querySelector('svg'));
}

function findActionRow(scope: ParentNode): HTMLElement | undefined {
  const candidates = [...scope.querySelectorAll<HTMLElement>('section, div')]
    .filter(isActionGroup);

  const labeled = candidates.find((element) =>
    [...element.querySelectorAll<HTMLElement>('[aria-label]')].some((node) =>
      /like|comment|share|save/i.test(node.getAttribute('aria-label') ?? ''),
    ),
  );

  return labeled ?? candidates.at(-1);
}

function visibleMediaUrls(scope: ParentNode, base: URL): string[] {
  const urls = new Set<string>();

  for (const video of scope.querySelectorAll<HTMLVideoElement>('video')) {
    const source = normalizeHttpUrl(
      video.currentSrc || video.getAttribute('src') || video.querySelector('source')?.src,
      base.href,
    );
    if (source && !source.startsWith('blob:')) {
      urls.add(source);
    }
    const poster = normalizeHttpUrl(video.poster, base.href);
    if (poster) {
      urls.add(poster);
    }
  }

  for (const image of scope.querySelectorAll<HTMLImageElement>('img')) {
    const source = imageSource(image, base.href);
    if (source) {
      urls.add(source);
    }
  }

  return [...urls];
}

function visibleKind(scope: ParentNode): 'image' | 'video' | undefined {
  if (scope.querySelector('video')) {
    return 'video';
  }

  return scope.querySelector('img') ? 'image' : undefined;
}

function gridTargets(document: Document, url: URL, pageType: PageType): InstagramActionTarget[] {
  const targets: InstagramActionTarget[] = [];
  const seen = new Set<string>();
  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'main a[href*="/p/"], main a[href*="/reel/"], main a[href*="/tv/"]',
  );

  for (const anchor of anchors) {
    const image = anchor.querySelector<HTMLImageElement>('img');
    if (!image) {
      continue;
    }

    const href = normalizeHttpUrl(anchor.getAttribute('href'), url.href);
    if (!href || seen.has(href)) {
      continue;
    }

    seen.add(href);
    const mediaUrl = imageSource(image, url.href);
    const isReel = /\/reel\//.test(href);

    targets.push({
      id: `grid:${pageType}:${href}`,
      platform: 'instagram',
      kind: 'grid',
      mount: anchor,
      postUrl: href,
      position: 'overlay',
      mediaUrls: mediaUrl ? [mediaUrl] : [],
      mediaKindHint: isReel ? 'video' : 'image',
      selectionMode: 'single',
    });
  }

  return targets;
}

function storyTarget(document: Document, url: URL): InstagramActionTarget[] {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  const mount =
    dialog && dialog.querySelector('img, video')
      ? dialog
      : document.querySelector<HTMLElement>('main');

  if (!mount || !mount.querySelector('img, video')) {
    return [];
  }

  return [
    {
      id: `story:${url.pathname}`,
      platform: 'instagram',
      kind: 'story',
      mount,
      postUrl: url.toString(),
      position: 'overlay-left',
      mediaUrls: visibleMediaUrls(mount, url),
      mediaKindHint: visibleKind(mount),
      selectionMode: 'single',
    },
  ];
}

function profilePictureTarget(
  document: Document,
  url: URL,
): InstagramActionTarget | undefined {
  const image = document.querySelector<HTMLImageElement>(
    'header img[alt*="profile picture" i], header img[alt*="profile photo" i], main img[alt*="profile picture" i], main img[alt*="profile photo" i]',
  );

  if (!image || !image.isConnected) {
    return undefined;
  }

  const mediaUrl = imageSource(image, url.href);
  return {
    id: 'profile-picture',
    platform: 'instagram',
    kind: 'profile-picture',
    mount: image,
    postUrl: url.toString(),
    position: 'after',
    mediaUrls: mediaUrl ? [mediaUrl] : [],
    mediaKindHint: 'image',
    selectionMode: 'single',
  };
}

export function findInstagramActionTargets(
  document: Document,
  url: URL,
): InstagramActionTarget[] {
  if (detectLoginWall(document) || detectPrivateContent(document)) {
    return [];
  }

  const pageType = detectInstagramPageType(url);

  if (pageType === 'profile' || pageType === 'tagged' || pageType === 'saved') {
    const profilePicture = pageType === 'profile' ? profilePictureTarget(document, url) : undefined;
    return [
      ...(profilePicture ? [profilePicture] : []),
      ...gridTargets(document, url, pageType),
    ];
  }

  if (pageType === 'story' || pageType === 'highlight') {
    return storyTarget(document, url);
  }

  if (
    pageType !== 'post' &&
    pageType !== 'reel' &&
    pageType !== 'video' &&
    pageType !== 'feed'
  ) {
    return [];
  }

  const targets: InstagramActionTarget[] = [];
  const articles = document.querySelectorAll<HTMLElement>('article');

  articles.forEach((article, index) => {
    if (!article.querySelector('img, video')) {
      return;
    }

    const postUrl = findPostUrl(article, url);
    const actionRow = findActionRow(article);
    targets.push({
      id: postUrl ? `post:${postUrl}` : `post:${url.pathname}:${index}`,
      platform: 'instagram',
      kind: 'post',
      mount: actionRow ?? article,
      postUrl,
      position: actionRow ? 'inline' : 'overlay',
      mediaUrls: visibleMediaUrls(article, url),
      mediaKindHint: visibleKind(article),
      selectionMode:
        pageType === 'reel' || pageType === 'video' ? 'single' : 'all',
    });
  });

  if (targets.length === 0 && (pageType === 'reel' || pageType === 'video')) {
    const video = document.querySelector<HTMLVideoElement>('video');
    const scope = video?.closest<HTMLElement>('article, section, main') ?? document.body;
    const actionRow = findActionRow(scope);

    if (scope.querySelector('video, img')) {
      targets.push({
        id: `post:${url.pathname}`,
        platform: 'instagram',
        kind: 'post',
        mount: actionRow ?? scope,
        postUrl: url.toString(),
        position: actionRow ? 'inline' : 'overlay',
        mediaUrls: visibleMediaUrls(scope, url),
        mediaKindHint: 'video',
        selectionMode: 'single',
      });
    }
  }

  return targets;
}
