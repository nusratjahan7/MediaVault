import type { InPageActionTarget } from '@/types/in-page';
import { normalizeHttpUrl } from '@/utils/url';
import { detectLoginWall, detectPrivateContent, imageSource } from '../shared/dom';
import { detectFacebookPageType } from './page-type';

const POST_LINK_SELECTOR = [
  'a[href*="/posts/"]',
  'a[href*="/permalink"]',
  'a[href*="/videos/"]',
  'a[href*="/reel/"]',
  'a[href*="/photo"]',
  'a[href*="photo.php"]',
  'a[href*="story_fbid"]',
  'a[href*="/share/"]',
].join(', ');

function findPostUrl(scope: ParentNode, base: URL): string | undefined {
  return (
    normalizeHttpUrl(
      scope.querySelector<HTMLAnchorElement>(POST_LINK_SELECTOR)?.getAttribute('href'),
      base.href,
    ) ?? undefined
  );
}

function isActionGroup(element: HTMLElement): boolean {
  const labels = [...element.querySelectorAll<HTMLElement>('[aria-label]')]
    .map((node) => node.getAttribute('aria-label') ?? '')
    .join(' ');
  const actions = element.querySelectorAll('button, [role="button"], a[role="button"]');
  return actions.length >= 2 && actions.length <= 16 && /like|comment|share/i.test(labels);
}

function hasActionLabel(element: HTMLElement, pattern: RegExp): boolean {
  return [...element.querySelectorAll<HTMLElement>('[aria-label]')].some((node) =>
    pattern.test((node.getAttribute('aria-label') ?? '').trim()),
  );
}

function findActionRow(scope: ParentNode): HTMLElement | undefined {
  const candidates = [...scope.querySelectorAll<HTMLElement>('div, section')].filter(
    isActionGroup,
  );
  const labeled = candidates
    .filter((element) => {
      const matches = [
        hasActionLabel(element, /^(like|unlike|remove like)\b/i),
        hasActionLabel(element, /^comment\b/i),
        hasActionLabel(element, /^share\b/i),
      ].filter(Boolean).length;
      return matches >= 2;
    })
    .sort(
      (left, right) =>
        left.querySelectorAll('*').length - right.querySelectorAll('*').length,
    );

  return labeled[0] ?? candidates[0];
}

function findActionControl(
  scope: ParentNode,
  pattern: RegExp,
): HTMLElement | undefined {
  const node = [...scope.querySelectorAll<HTMLElement>('[aria-label]')].find((element) =>
    pattern.test((element.getAttribute('aria-label') ?? '').trim()),
  );

  if (node) {
    return (
      node.closest<HTMLElement>('button, [role="button"], a[role="button"]') ?? node
    );
  }

  return [...scope.querySelectorAll<HTMLElement>('button, [role="button"], a[role="button"]')]
    .filter((element) => (element.textContent ?? '').trim().length <= 40)
    .find((element) => pattern.test((element.textContent ?? '').trim()));
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

function postPlacement(
  article: HTMLElement,
  actionRow: HTMLElement | undefined,
  kind: 'post' | 'video' | 'reel',
): Pick<InPageActionTarget, 'mount' | 'position'> {
  const controls = actionRow ?? article;
  const like = findActionControl(controls, /^(like|unlike|remove like)$/i);
  const share =
    findActionControl(controls, /^share$/i) ??
    findActionControl(controls, /^share\b/i);

  if (kind === 'reel' && like) {
    return { mount: rowLevelMount(like, actionRow), position: 'before' };
  }

  if (share) {
    return { mount: rowLevelMount(share, actionRow), position: 'after' };
  }

  if (actionRow) {
    return { mount: actionRow, position: 'inline' };
  }

  return { mount: article, position: 'overlay' };
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

function storyTarget(
  document: Document,
  url: URL,
): InPageActionTarget[] {
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
  const mount =
    dialog && dialog.querySelector('video, img')
      ? dialog
      : document.querySelector<HTMLElement>('main');

  if (!mount || !mount.querySelector('video, img')) {
    return [];
  }

  return [
    {
      id: `facebook-story:${url.pathname}`,
      platform: 'facebook',
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

function albumTargets(document: Document, url: URL): InPageActionTarget[] {
  const targets: InPageActionTarget[] = [];
  const seen = new Set<string>();
  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'a[href*="/photo"], a[href*="photo.php"]',
  );

  for (const anchor of anchors) {
    const image = anchor.querySelector<HTMLImageElement>('img');
    if (!image) {
      continue;
    }

    const postUrl = normalizeHttpUrl(anchor.getAttribute('href'), url.href);
    const mediaUrl = imageSource(image, url.href);
    const key = postUrl ?? mediaUrl;
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    targets.push({
      id: `facebook-album:${key}`,
      platform: 'facebook',
      kind: 'album',
      mount: anchor,
      postUrl: postUrl ?? undefined,
      position: 'overlay',
      mediaUrls: mediaUrl ? [mediaUrl] : [],
      mediaKindHint: 'image',
      selectionMode: 'single',
    });
  }

  return targets;
}

export function findFacebookActionTargets(
  document: Document,
  url: URL,
): InPageActionTarget[] {
  if (detectLoginWall(document) || detectPrivateContent(document)) {
    return [];
  }

  const pageType = detectFacebookPageType(url);

  if (pageType === 'story' || pageType === 'highlight') {
    return storyTarget(document, url);
  }

  if (pageType === 'album') {
    return albumTargets(document, url);
  }

  const targets: InPageActionTarget[] = [];
  const articles = document.querySelectorAll<HTMLElement>('[role="article"]');

  articles.forEach((article, index) => {
    if (!article.querySelector('video, img')) {
      return;
    }

    const postUrl = findPostUrl(article, url);
    const actionRow = findActionRow(article);
    const kind =
      pageType === 'reel'
        ? 'reel'
        : pageType === 'video'
          ? 'video'
          : 'post';

    const placement = postPlacement(article, actionRow, kind);
    targets.push({
      id: postUrl ? `facebook-post:${postUrl}` : `facebook-post:${url.pathname}:${index}`,
      platform: 'facebook',
      kind,
      mount: placement.mount,
      postUrl,
      position: placement.position,
      mediaUrls: visibleMediaUrls(article, url),
      mediaKindHint: visibleKind(article),
      selectionMode:
        kind === 'post' && visibleKind(article) !== 'video' ? 'all' : 'single',
    });
  });

  if (
    targets.length === 0 &&
    (pageType === 'post' || pageType === 'reel' || pageType === 'video')
  ) {
    const media = document.querySelector<HTMLElement>('video, img');
    const scope = media?.closest<HTMLElement>('[role="article"], main') ?? document.body;
    const actionRow = findActionRow(scope);
    const kind = pageType === 'reel' ? 'reel' : pageType === 'video' ? 'video' : 'post';
    const placement = postPlacement(scope, actionRow, kind);

    if (scope.querySelector('video, img')) {
      targets.push({
        id: `facebook-page:${url.pathname}`,
        platform: 'facebook',
        kind,
        mount: placement.mount,
        postUrl: url.toString(),
        position: placement.position,
        mediaUrls: visibleMediaUrls(scope, url),
        mediaKindHint: visibleKind(scope),
        selectionMode:
          kind === 'post' && visibleKind(scope) !== 'video' ? 'all' : 'single',
      });
    }
  }

  return targets;
}
