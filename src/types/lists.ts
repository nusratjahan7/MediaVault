import type { PlatformId } from './platform';

export interface SavedProfile {
  id: string;
  platform: PlatformId;
  username: string;
  profileUrl: string;
  displayName?: string;
  addedAt: number;
}

export interface SavedList {
  id: string;
  name: string;
  platform: PlatformId;
  accounts: SavedProfile[];
  createdAt: number;
  updatedAt: number;
}

export interface SavedListsExport {
  app: 'MediaVault';
  version: 1;
  exportedAt: string;
  lists: SavedList[];
}

export interface ProfileWorkflow {
  id: string;
  profiles: SavedProfile[];
  index: number;
  createdAt: number;
  updatedAt: number;
}
