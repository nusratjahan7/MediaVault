import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { App } from '@/stories/App';
import type { ApiResponse, BackgroundRequest } from '@/types/messages';
import { chromeMock, setActiveTabUrl } from '../mocks/chrome';

const STORY_URL = 'https://www.instagram.com/stories/studio.north/123/';

const STORY = {
  id: 'instagram:story:story-1',
  platform: 'instagram' as const,
  account: {
    platform: 'instagram' as const,
    username: 'studio.north',
    displayName: 'North Studio',
  },
  item: {
    id: 'instagram_story_1',
    platform: 'instagram' as const,
    kind: 'image' as const,
    url: 'https://scontent.cdninstagram.com/v/t51/story.jpg',
    thumbnailUrl: 'https://scontent.cdninstagram.com/v/t51/story.jpg',
    author: 'studio.north',
    downloadable: true,
  },
  expiresAt: Date.now() + 6 * 60 * 60 * 1000,
  postedAt: Date.now() - 60 * 60 * 1000,
  expired: false,
  available: true,
  sourcePageUrl: STORY_URL,
};

const HIGHLIGHT = {
  id: 'instagram:highlight:777',
  platform: 'instagram' as const,
  account: {
    platform: 'instagram' as const,
    username: 'studio.north',
    displayName: 'North Studio',
  },
  title: 'Travel',
  cover: {
    id: 'instagram_cover',
    platform: 'instagram' as const,
    kind: 'image' as const,
    url: 'https://scontent.cdninstagram.com/v/t51/cover.jpg',
    thumbnailUrl: 'https://scontent.cdninstagram.com/v/t51/cover.jpg',
    downloadable: true,
    collectionType: 'highlight' as const,
    collectionTitle: 'Travel',
  },
  items: [
    {
      id: 'instagram_highlight_1',
      platform: 'instagram' as const,
      kind: 'image' as const,
      url: 'https://scontent.cdninstagram.com/v/t51/highlight.jpg',
      thumbnailUrl: 'https://scontent.cdninstagram.com/v/t51/highlight.jpg',
      downloadable: true,
      collectionType: 'highlight' as const,
      collectionTitle: 'Travel',
    },
  ],
  sourcePageUrl: 'https://www.instagram.com/stories/highlights/777/',
  available: true,
};

function respond(
  handler: (request: BackgroundRequest) => ApiResponse<unknown> | undefined,
): void {
  chromeMock.runtime.sendMessage.mockImplementation(
    (message: unknown, callback?: (response: unknown) => void) => {
      callback?.(handler(message as BackgroundRequest));
    },
  );
}

function renderStories() {
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

describe('stories and highlights page', () => {
  it('shows privacy limits, stories, highlights, and queues a story download', async () => {
    setActiveTabUrl(STORY_URL);
    const user = userEvent.setup();

    respond((request) => {
      switch (request.type) {
        case 'SITES_STATUS':
          return {
            ok: true,
            data: [
              {
                platform: 'instagram',
                label: 'Instagram',
                enabled: true,
                permissionGranted: true,
              },
            ],
          };
        case 'SCAN_TAB':
          return {
            ok: true,
            data: {
              platform: 'instagram',
              pageUrl: STORY_URL,
              scannedAt: 1,
              pageType: 'story',
              account: STORY.account,
              items: [STORY.item],
              limitations: [],
              stories: [STORY],
              highlights: [HIGHLIGHT],
            },
          };
        case 'DOWNLOAD_ITEMS':
          return {
            ok: true,
            data: {
              accepted: [
                {
                  id: 'job-1',
                  itemId: STORY.item.id,
                  filename: 'story.jpg',
                  status: 'queued',
                },
              ],
              skipped: 0,
              alreadyDownloaded: 0,
            },
          };
        default:
          return undefined;
      }
    });

    renderStories();

    expect(
      await screen.findByRole('heading', { name: 'Stories & highlights' }),
    ).toBeTruthy();
    expect(screen.getByText(/does not hide view activity/i)).toBeTruthy();
    expect(await screen.findByText('North Studio')).toBeTruthy();
    expect(screen.getByText('Travel')).toBeTruthy();
    expect(screen.getByText(/Expires in/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save all from account' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save story' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save highlight' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save cover' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Save story' }));

    await vi.waitFor(() => {
      expect(
        chromeMock.runtime.sendMessage.mock.calls.some(
          ([message]) =>
            (message as { type?: string }).type === 'DOWNLOAD_ITEMS',
        ),
      ).toBe(true);
    });

    const call = chromeMock.runtime.sendMessage.mock.calls.find(
      ([message]) => (message as { type?: string }).type === 'DOWNLOAD_ITEMS',
    );
    expect((call?.[0] as { items: unknown[] }).items).toHaveLength(1);
  });
});
