import type { MediaItem } from './media';
import type { AccountIdentity } from './page';
import type { PlatformId } from './platform';

export interface StoryMedia {
  id: string;
  platform: PlatformId;
  account: AccountIdentity | null;
  item: MediaItem;
  storyId?: string;
  postedAt?: number;
  expiresAt?: number;
  expired: boolean;
  available: boolean;
  unavailableReason?: string;
  sourcePageUrl: string;
}

export interface HighlightMedia {
  id: string;
  platform: PlatformId;
  account: AccountIdentity | null;
  title: string;
  cover?: MediaItem;
  items: MediaItem[];
  sourcePageUrl: string;
  available: boolean;
  unavailableReason?: string;
}
