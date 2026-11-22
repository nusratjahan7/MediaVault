export type RelationshipKind = 'followers' | 'following';

export interface RelationshipEntry {
  username: string;
  profileUrl?: string;
  displayName?: string;
}

export interface RelationshipDiscovery {
  kind: RelationshipKind;
  entries: RelationshipEntry[];
}
