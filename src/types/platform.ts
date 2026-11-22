export type PlatformId = 'instagram' | 'facebook' | 'tiktok';

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  description: string;
  originPatterns: string[];
  hostnames: string[];
}

export interface SiteStatus {
  platform: PlatformId;
  label: string;
  enabled: boolean;
  permissionGranted: boolean;
}
