import type { PageContext, PageKind, PreviewAccount } from '@/types/ui';
import type { PlatformId } from '@/types/platform';
import { MOCK_PAGE_URLS } from './media';

interface MockPageSeed {
  pageTitle: string;
  pageKind: PageKind;
}

const PAGES: Record<PlatformId, MockPageSeed> = {
  instagram: {
    pageTitle: 'A quiet morning walk through the new studio space.',
    pageKind: 'post',
  },
  facebook: {
    pageTitle: 'Behind the scenes of the Atlas short film.',
    pageKind: 'video',
  },
  tiktok: {
    pageTitle: 'Three lighting tricks for small rooms.',
    pageKind: 'video',
  },
};

export function getMockPageContext(
  platform: PlatformId,
  account: PreviewAccount,
): PageContext {
  const page = PAGES[platform];

  return {
    platform,
    author: account.handle,
    accountName: account.displayName,
    handle: account.handle,
    pageTitle: page.pageTitle,
    pageUrl: MOCK_PAGE_URLS[platform],
    pageKind: page.pageKind,
    mediaCount: platform === 'instagram' ? 4 : 3,
    capturedAt: Date.now(),
    mode: 'demo',
  };
}
