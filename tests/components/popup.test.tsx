import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { App } from '@/popup/App';
import { getTabSelection } from '@/storage/selection';
import { saveSettings } from '@/storage/settings';
import type { ApiResponse, BackgroundRequest } from '@/types/messages';
import { chromeMock, setActiveTabUrl } from '../mocks/chrome';

const SCAN_RESULT = {
  platform: 'instagram' as const,
  pageUrl: 'https://www.instagram.com/p/ABC/',
  scannedAt: 1,
  items: [
    {
      id: 'instagram_abc12345',
      platform: 'instagram' as const,
      kind: 'image' as const,
      url: 'https://scontent.cdninstagram.com/v/photo.jpg',
      thumbnailUrl: 'https://scontent.cdninstagram.com/v/photo.jpg',
      author: 'studio',
      downloadable: true,
    },
  ],
  limitations: [],
};

const SITE_STATUS = [
  {
    platform: 'instagram' as const,
    label: 'Instagram',
    enabled: true,
    permissionGranted: true,
  },
];

function respondToBackground(
  handler: (request: BackgroundRequest) => ApiResponse<unknown> | undefined,
): void {
  chromeMock.runtime.sendMessage.mockImplementation(
    (message: unknown, callback?: (response: unknown) => void) => {
      callback?.(handler(message as BackgroundRequest));
    },
  );
}

function renderPopup() {
  return render(
    <SettingsProvider>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </SettingsProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe('popup', () => {
  it('shows the permission gate until a site is enabled', async () => {
    respondToBackground((request) =>
      request.type === 'SITES_STATUS'
        ? {
            ok: true,
            data: [
              {
                platform: 'instagram',
                label: 'Instagram',
                enabled: false,
                permissionGranted: false,
              },
            ],
          }
        : { ok: true, data: { items: [], limitations: [] } as never },
    );

    renderPopup();

    expect(await screen.findByText('Enable MediaVault on Instagram')).toBeTruthy();
    expect(screen.getByText('No access until you allow it')).toBeTruthy();
  });

  it('renders scanned media for an enabled site', async () => {
    respondToBackground((request) => {
      switch (request.type) {
        case 'SITES_STATUS':
          return { ok: true, data: SITE_STATUS };
        case 'SCAN_TAB':
          return { ok: true, data: SCAN_RESULT };
        default:
          return undefined;
      }
    });

    renderPopup();

    expect(await screen.findByText('1 item found')).toBeTruthy();
    expect(screen.getByText('@studio')).toBeTruthy();
    expect(screen.getByText('Live page')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download current' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bulk download' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start select' })).toBeTruthy();
    expect(screen.getByText(/Local only/)).toBeTruthy();
  });

  it('runs the complete UI preview from mock data without downloading', async () => {
    await saveSettings({ demoMode: true });
    const user = userEvent.setup();

    renderPopup();

    expect(
      await screen.findByRole('radiogroup', { name: 'Preview platform' }),
    ).toBeTruthy();
    expect(screen.getByText('UI preview.')).toBeTruthy();
    expect(screen.getByText('North Studio')).toBeTruthy();
    expect(await screen.findByText('Download queue')).toBeTruthy();
    expect(await screen.findByText('4 items found')).toBeTruthy();
    expect(screen.getByText(/Demo data · nothing is downloaded/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Download current' }));

    expect(await screen.findByText('Preview: 1 item queued')).toBeTruthy();
    expect(chromeMock.downloads.download).not.toHaveBeenCalled();
    expect(chromeMock.runtime.sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'DOWNLOAD_ITEMS' }),
      expect.any(Function),
    );
  });

  it('shows the caption export action for Facebook pages', async () => {
    setActiveTabUrl('https://www.facebook.com/photo/?fbid=123');
    respondToBackground((request) => {
      switch (request.type) {
        case 'SITES_STATUS':
          return {
            ok: true,
            data: [
              {
                platform: 'facebook',
                label: 'Facebook',
                enabled: true,
                permissionGranted: true,
              },
            ],
          };
        case 'SCAN_TAB':
          return {
            ok: true,
            data: {
              platform: 'facebook',
              pageUrl: 'https://www.facebook.com/photo/?fbid=123',
              scannedAt: 1,
              items: [
                {
                  id: 'facebook_abc12345',
                  platform: 'facebook',
                  kind: 'image',
                  url: 'https://scontent.xx.fbcdn.net/v/photo.jpg',
                  thumbnailUrl: 'https://scontent.xx.fbcdn.net/v/photo.jpg',
                  author: 'atlasfilms',
                  caption: 'A day at the lake',
                  downloadable: true,
                },
              ],
              limitations: [],
              pageType: 'post',
              account: {
                platform: 'facebook',
                username: 'atlasfilms',
                displayName: 'Atlas Films',
              },
            },
          };
        default:
          return undefined;
      }
    });

    renderPopup();

    expect(await screen.findByText('A day at the lake')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Copy caption & source URL' }),
    ).toBeTruthy();
  });

  it('supports bulk selection of accessible TikTok videos', async () => {
    setActiveTabUrl('https://www.tiktok.com/@creator/video/730');
    const user = userEvent.setup();

    respondToBackground((request) => {
      switch (request.type) {
        case 'SITES_STATUS':
          return {
            ok: true,
            data: [
              {
                platform: 'tiktok',
                label: 'TikTok',
                enabled: true,
                permissionGranted: true,
              },
            ],
          };
        case 'HISTORY_QUERY':
          return { ok: true, data: { entries: [], total: 0, hasMore: false } };
        case 'SCAN_TAB':
          return {
            ok: true,
            data: {
              platform: 'tiktok',
              pageUrl: 'https://www.tiktok.com/@creator/video/730',
              scannedAt: 1,
              pageType: 'video',
              account: {
                platform: 'tiktok',
                username: 'creator',
                displayName: 'Creator',
              },
              items: [
                {
                  id: 'tiktok_one',
                  platform: 'tiktok',
                  kind: 'video',
                  url: 'https://v16.tiktokcdn.com/one.mp4',
                  thumbnailUrl: 'https://p16.tiktokcdn.com/one.jpg',
                  author: 'creator',
                  caption: 'First video',
                  downloadable: true,
                },
                {
                  id: 'tiktok_two',
                  platform: 'tiktok',
                  kind: 'video',
                  url: 'https://v16.tiktokcdn.com/two.mp4',
                  thumbnailUrl: 'https://p16.tiktokcdn.com/two.jpg',
                  author: 'creator',
                  caption: 'Second video',
                  downloadable: true,
                },
              ],
              limitations: [],
            },
          };
        case 'DOWNLOAD_ITEMS':
          return {
            ok: true,
            data: {
              accepted: request.items.map((item, index) => ({
                id: `job-${index}`,
                itemId: item.id,
                filename: `tiktok-${index}.mp4`,
                status: 'queued',
              })),
              skipped: 0,
              alreadyDownloaded: 0,
            },
          };
        default:
          return undefined;
      }
    });

    renderPopup();

    expect(await screen.findByText('2 items found')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Copy caption & source URL' }),
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Start select' }));
    await user.click(screen.getByRole('button', { name: 'Select all 2' }));

    await vi.waitFor(async () => {
      expect(await getTabSelection(1)).toHaveLength(2);
    });

    await user.click(screen.getByRole('button', { name: 'Download 2' }));

    await vi.waitFor(() => {
      expect(
        chromeMock.runtime.sendMessage.mock.calls.some(
          ([message]) =>
            (message as { type?: string }).type === 'DOWNLOAD_ITEMS',
        ),
      ).toBe(true);
    });

    const downloadCall = chromeMock.runtime.sendMessage.mock.calls.find(
      ([message]) => (message as { type?: string }).type === 'DOWNLOAD_ITEMS',
    );
    const request = downloadCall?.[0] as { items: unknown[] };
    expect(request.items).toHaveLength(2);
    expect(await screen.findByText('2 downloads queued')).toBeTruthy();
  });

  it('shows a clear unsupported-page state', async () => {
    setActiveTabUrl('https://example.com/');

    renderPopup();

    expect(await screen.findByText('Not a supported page')).toBeTruthy();
    expect(screen.getByText('Supported platforms')).toBeTruthy();
  });
});
