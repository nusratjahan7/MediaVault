import type { MediaItem, ScanLimitation, ScanResult } from '@/types/media';
import type { PlatformId } from '@/types/platform';
import { createMediaId } from '@/utils/id';
import { MOCK_THUMBNAILS } from './mock-thumbnails';

export const MOCK_PAGE_URLS: Record<PlatformId, string> = {
  instagram: 'https://www.instagram.com/p/preview-north-studio/',
  facebook: 'https://www.facebook.com/watch/?v=preview-atlas',
  tiktok: 'https://www.tiktok.com/@studio.north/video/preview-7300',
};

function media(
  platform: PlatformId,
  kind: MediaItem['kind'],
  url: string,
  values: Omit<Partial<MediaItem>, 'id' | 'platform' | 'kind' | 'url'> = {},
): MediaItem {
  return {
    id: createMediaId(platform, url),
    platform,
    kind,
    url,
    downloadable: true,
    postUrl: MOCK_PAGE_URLS[platform],
    ...values,
  };
}

const INSTAGRAM_MEDIA: MediaItem[] = [
  media('instagram', 'video', 'https://preview.mediavault.local/instagram/studio-tour.mp4', {
    thumbnailUrl: MOCK_THUMBNAILS.studioTour,
    width: 1080,
    height: 1920,
    durationSeconds: 32,
    author: 'studio.north',
    caption: 'A quiet morning walk through the new studio space.',
  }),
  media('instagram', 'image', 'https://preview.mediavault.local/instagram/golden-hour.jpg', {
    thumbnailUrl: MOCK_THUMBNAILS.goldenHour,
    width: 1440,
    height: 1800,
    author: 'studio.north',
    caption: 'Golden hour, straight out of camera.',
  }),
  media('instagram', 'image', 'https://preview.mediavault.local/instagram/detail-shot.jpg', {
    thumbnailUrl: MOCK_THUMBNAILS.detailShot,
    width: 1440,
    height: 1440,
    author: 'studio.north',
    caption: 'Texture study — natural light only.',
  }),
  media('instagram', 'video', 'https://preview.mediavault.local/instagram/lighting-test.mp4', {
    thumbnailUrl: MOCK_THUMBNAILS.lightingTest,
    width: 1080,
    height: 1350,
    durationSeconds: 18,
    author: 'studio.north',
    caption: 'Three lighting setups in eighteen seconds.',
  }),
];

const FACEBOOK_MEDIA: MediaItem[] = [
  media('facebook', 'image', 'https://preview.mediavault.local/facebook/lake-house.jpg', {
    thumbnailUrl: MOCK_THUMBNAILS.lakeHouse,
    width: 2048,
    height: 1365,
    author: 'atlasfilms',
    caption: 'Location scouting at the lake house.',
  }),
  media('facebook', 'video', 'https://preview.mediavault.local/facebook/atlas-film.mp4', {
    thumbnailUrl: MOCK_THUMBNAILS.atlasFilm,
    width: 1920,
    height: 1080,
    durationSeconds: 74,
    author: 'atlasfilms',
    caption: 'Behind the scenes of the Atlas short film.',
  }),
  media('facebook', 'video', 'https://preview.mediavault.local/facebook/stream-preview.mp4', {
    thumbnailUrl: MOCK_THUMBNAILS.streamPreview,
    width: 1280,
    height: 720,
    durationSeconds: 46,
    author: 'atlasfilms',
    caption: 'Live playback preview.',
    downloadable: false,
    unsupportedReason: 'Adaptive stream — no direct file link.',
  }),
];

const TIKTOK_MEDIA: MediaItem[] = [
  media('tiktok', 'video', 'https://preview.mediavault.local/tiktok/lighting-tricks.mp4', {
    thumbnailUrl: MOCK_THUMBNAILS.tiktokVideo,
    width: 1080,
    height: 1920,
    durationSeconds: 27,
    author: 'studio.north',
    caption: 'Three lighting tricks for small rooms.',
  }),
  media('tiktok', 'image', 'https://preview.mediavault.local/tiktok/slide-a.jpg', {
    thumbnailUrl: MOCK_THUMBNAILS.tiktokSlideA,
    width: 1080,
    height: 1440,
    author: 'studio.north',
    caption: 'Slideshow: frame one.',
  }),
  media('tiktok', 'image', 'https://preview.mediavault.local/tiktok/slide-b.jpg', {
    thumbnailUrl: MOCK_THUMBNAILS.tiktokSlideB,
    width: 1080,
    height: 1440,
    author: 'studio.north',
    caption: 'Slideshow: frame two.',
  }),
];

export const MOCK_MEDIA: Record<PlatformId, MediaItem[]> = {
  instagram: INSTAGRAM_MEDIA,
  facebook: FACEBOOK_MEDIA,
  tiktok: TIKTOK_MEDIA,
};

const MOCK_LIMITATIONS: Record<PlatformId, ScanLimitation[]> = {
  instagram: [
    {
      code: 'partial-extraction',
      severity: 'info',
      message:
        'Carousels include only the slides rendered on this page. Demo preview shows four sample items.',
    },
  ],
  facebook: [
    {
      code: 'blob-video',
      severity: 'warning',
      message:
        'One Facebook video is delivered as an adaptive stream and cannot be saved. The preview marks it clearly.',
    },
  ],
  tiktok: [
    {
      code: 'signed-url-expiry',
      severity: 'info',
      message:
        'TikTok media links expire quickly. In a live session, download while the page is open.',
    },
  ],
};

export function getMockScanResult(platform: PlatformId): ScanResult {
  return {
    platform,
    pageUrl: MOCK_PAGE_URLS[platform],
    scannedAt: Date.now(),
    items: MOCK_MEDIA[platform].map((item) => ({ ...item })),
    limitations: MOCK_LIMITATIONS[platform].map((limitation) => ({ ...limitation })),
  };
}
