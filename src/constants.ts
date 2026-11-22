import type { PlatformId, PlatformMeta } from '@/types/platform';

export const APP_NAME = 'MediaVault';
export const APP_VERSION = '0.1.0';

export const DB_NAME = 'mediavault';
export const DB_VERSION = 1;
export const HISTORY_STORE = 'history' as const;

export const SETTINGS_STORAGE_KEY = 'mediavault:settings:v1';
export const SITES_STORAGE_KEY = 'mediavault:sites:v1';
export const PREVIEW_ACCOUNTS_STORAGE_KEY = 'mediavault:preview:accounts:v1';
export const SETTINGS_SCHEMA_VERSION = 1;

export const CONTENT_SCRIPT_FILE = 'content.js';
export const CONTENT_SCRIPT_ID_PREFIX = 'mediavault-content-';

export const MESSAGE_TIMEOUT_MS = 10_000;
export const SCAN_TIMEOUT_MS = 12_000;
export const MIN_DOWNLOAD_CONCURRENCY = 1;
export const MAX_DOWNLOAD_CONCURRENCY = 3;
export const DEFAULT_DOWNLOAD_CONCURRENCY = 2;
export const MAX_SCAN_ITEMS = 200;
export const MIN_IMAGE_SIZE = 150;
export const MAX_FILENAME_LENGTH = 120;
export const MAX_CAPTION_LENGTH = 280;

export const DEFAULT_HISTORY_LIMIT = 50;
export const MIN_HISTORY_ENTRIES = 50;
export const MAX_HISTORY_ENTRIES = 1000;

export const PLATFORM_META: Record<PlatformId, PlatformMeta> = {
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    description: 'Posts, reels, and photos that are visible on the current page.',
    originPatterns: ['https://*.instagram.com/*'],
    hostnames: ['instagram.com'],
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    description: 'Photos and directly hosted videos visible on the current page.',
    originPatterns: ['https://*.facebook.com/*'],
    hostnames: ['facebook.com'],
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    description: 'Videos and photo slideshows visible on the current page.',
    originPatterns: ['https://*.tiktok.com/*'],
    hostnames: ['tiktok.com'],
  },
};

export const PLATFORM_IDS = Object.keys(PLATFORM_META) as PlatformId[];
