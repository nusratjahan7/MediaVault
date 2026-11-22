import type { InPageActionTarget } from '@/types/in-page';
import { normalizeHttpUrl } from '@/utils/url';
import { detectLoginWall, detectPrivateContent, imageSource } from '../shared/dom';
import { detectTikTokPageType } from './page-type';

function interactiveControl(node: HTMLElement): HTMLElement {
  return (
    node.closest<HTMLElement>('button, [role="button"], a[role="button"]') ?? node
  );
}

function findShareControl(document: Document): HTMLElement | undefined {
  const node =
    document.querySelector<HTMLElement>('[data-e2e="share-icon"]') ??
    [...document.querySelectorAll<HTMLElement>('[aria-label]')].find((element) =>
      /^share\b/i.test((element.getAttribute('aria-label') ?? '').trim()),
    );

  return node ? interactiveControl(node) : undefined;
}

function rowLevelMount(
  control: HTMLElement,
  actionRow: HTMLElement | undefined,
): HTMLElement {
  if (!actionRow || !actionRow.contains(control)) {
    return control;
  }

  let mount = control;
  while (mount.parentElement && mount.parentElement !== actionRow) {
    mount = mount.parentElement;
  }

  return mount;
}

function findActionRow(document: Document): HTMLElement | undefined {
  const anchors = [
    '[data-e2e="like-icon"]',
    '[data-e2e="comment-icon"]',
    '[data-e2e="share-icon"]',
    '[aria-label*="Like" i]',
    '[aria-label*="Comment" i]',
    '[aria-label*="Share" i]',
  ];

  const nodes = anchors
    .map((selector) => document.querySelector<HTMLElement>(selector))
    .filter((node): node is HTMLElement => Boolean(node));

  for (const node of nodes) {
    let current: HTMLElement | null = node;
    for (let depth = 0; depth < 7 && current; depth += 1) {
      const controls = current.querySelectorAll(
        'button, [role="button"], a[role="button"]',
      );
      if (controls.length >= 2 && current.querySelectorAll('[data-e2e]').length >= 2) {
        return current;
      }
      current = current.parentElement;
    }
  }

  return undefined;
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
  return scope.querySelector('video')
    ? 'video'
    : scope.querySelector('img')
      ? 'image'
      : undefined;
}

function profileTargets(document: Document, url: URL): InPageActionTarget[] {
  const targets: InPageActionTarget[] = [];
  const seen = new Set<string>();
  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'main a[href*="/video/"], main a[href*="/photo/"]',
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
    targets.push({
      id: `tiktok-grid:${href}`,
      platform: 'tiktok',
      kind: 'grid',
      mount: anchor,
      postUrl: href,
      position: 'overlay',
      mediaUrls: mediaUrl ? [mediaUrl] : [],
      mediaKindHint: 'image',
      selectionMode: 'prefer-video',
    });
  }

  return targets;
}

export function findTikTokActionTargets(
  document: Document,
  url: URL,
): InPageActionTarget[] {
  if (detectLoginWall(document) || detectPrivateContent(document)) {
    return [];
  }

  const pageType = detectTikTokPageType(url);

  if (pageType === 'profile' || pageType === 'tagged' || pageType === 'saved') {
    return profileTargets(document, url);
  }

  if (pageType !== 'video' && pageType !== 'post' && pageType !== 'story') {
    return [];
  }

  const video = document.querySelector<HTMLVideoElement>('video');
  const scope =
    video?.closest<HTMLElement>('main, [data-e2e="browse-video"], [data-e2e="recommend-list-item-container"], article') ??
    document.querySelector<HTMLElement>('main') ??
    document.body;

  if (!scope.querySelector('video, img')) {
    return [];
  }

  const actionRow = findActionRow(document);
  const share = findShareControl(document);

  return [
    {
      id: `tiktok-current:${url.pathname}`,
      platform: 'tiktok',
      kind: pageType === 'story' ? 'story' : 'video',
      mount: share ? rowLevelMount(share, actionRow) : (actionRow ?? scope),
      postUrl: url.toString(),
      position: share ? 'after' : actionRow ? 'inline' : 'overlay',
      mediaUrls: visibleMediaUrls(scope, url),
      mediaKindHint: visibleKind(scope),
      selectionMode: 'single',
    },
  ];
}
