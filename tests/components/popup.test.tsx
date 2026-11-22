import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { App } from '@/popup/App';
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
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
    expect(screen.getByText('0 items selected')).toBeTruthy();
    expect(screen.getByText(/Local only/)).toBeTruthy();
  });

  it('shows a clear unsupported-page state', async () => {
    setActiveTabUrl('https://example.com/');

    renderPopup();

    expect(await screen.findByText('Not a supported page')).toBeTruthy();
    expect(screen.getByText('Supported platforms')).toBeTruthy();
  });
});
