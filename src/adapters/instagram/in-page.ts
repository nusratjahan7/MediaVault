import type { PageType } from '@/types/page';
import { normalizeHttpUrl } from '@/utils/url';
import { detectLoginWall, detectPrivateContent } from '../shared/dom';
import { detectInstagramPageType } from './page-type';

export type InstagramActionKind = 'post' | 'grid' | 'story';

export interface InstagramActionTarget {
  id: string;
  kind: InstagramActionKind;
  mount: HTMLElement;
  postUrl?: string;
  position: 'inline' | 'overlay';
}

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

function findActionRow(article: HTMLElement): HTMLElement | undefined {
  const candidates = [...article.querySelectorAll<HTMLElement>('section, div')]
    .filter(isActionGroup);

  const labeled = candidates.find((element) =>
    [...element.querySelectorAll<HTMLElement>('[aria-label]')].some((node) =>
      /like|comment|share|save/i.test(node.getAttribute('aria-label') ?? ''),
    ),
  );

  return labeled ?? candidates.at(-1);
}

function gridTargets(document: Document, url: URL, pageType: PageType): InstagramActionTarget[] {
  const targets: InstagramActionTarget[] = [];
  const seen = new Set<string>();
  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'main a[href*="/p/"], main a[href*="/reel/"], main a[href*="/tv/"]',
  );

  for (const anchor of anchors) {
    if (!anchor.querySelector('img')) {
      continue;
    }

    const href = normalizeHttpUrl(anchor.getAttribute('href'), url.href);
    if (!href || seen.has(href)) {
      continue;
    }

    seen.add(href);
    targets.push({
      id: `grid:${pageType}:${href}`,
      kind: 'grid',
      mount: anchor,
      postUrl: href,
      position: 'overlay',
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
      kind: 'story',
      mount,
      postUrl: url.toString(),
      position: 'overlay',
    },
  ];
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
    return gridTargets(document, url, pageType);
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
      kind: 'post',
      mount: actionRow ?? article,
      postUrl,
      position: actionRow ? 'inline' : 'overlay',
    });
  });

  return targets;
}
