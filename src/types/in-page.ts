import type { MediaKind, MediaItem } from './media';
import type { PlatformId } from './platform';

export type InPageActionKind =
  | 'post'
  | 'reel'
  | 'video'
  | 'story'
  | 'profile-picture'
  | 'grid'
  | 'album';

export type InPageButtonPosition =
  | 'inline'
  | 'overlay'
  | 'overlay-left'
  | 'overlay-right'
  | 'beside-left'
  | 'after'
  | 'before';

export type InPageSelectionMode = 'all' | 'single' | 'prefer-video';

export interface InPageActionTarget {
  id: string;
  platform: PlatformId;
  kind: InPageActionKind;
  mount: HTMLElement;
  position: InPageButtonPosition;
  postUrl?: string;
  mediaUrls?: string[];
  mediaKindHint?: MediaKind;
  selectionMode?: InPageSelectionMode;
  label?: string;
}

export interface InPageActionContext {
  target: InPageActionTarget;
  items: MediaItem[];
}
