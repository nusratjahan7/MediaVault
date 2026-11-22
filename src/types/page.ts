import type { PlatformId } from './platform';

export type PageType =
  | 'profile'
  | 'feed'
  | 'post'
  | 'reel'
  | 'video'
  | 'story'
  | 'highlight'
  | 'tagged'
  | 'saved'
  | 'unknown';

export interface PlatformDetection {
  platform: PlatformId;
  supported: boolean;
  url: string;
}

export interface AccountIdentity {
  platform: PlatformId;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  isPageOwner?: boolean;
}
