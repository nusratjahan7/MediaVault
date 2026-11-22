import { getAdapterForUrl } from '@/adapters/registry';
import { findFacebookActionTargets } from '@/adapters/facebook/in-page';
import { findInstagramActionTargets } from '@/adapters/instagram/in-page';
import { findTikTokActionTargets } from '@/adapters/tiktok/in-page';
import type { InPageActionTarget } from '@/types/in-page';

export function findInPageTargets(
  document: Document,
  url: URL,
): InPageActionTarget[] {
  const platform = getAdapterForUrl(url)?.id;

  switch (platform) {
    case 'instagram':
      return findInstagramActionTargets(document, url);
    case 'facebook':
      return findFacebookActionTargets(document, url);
    case 'tiktok':
      return findTikTokActionTargets(document, url);
    default:
      return [];
  }
}
