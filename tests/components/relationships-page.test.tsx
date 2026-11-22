import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { App } from '@/relationships/App';
import type { BackgroundRequest } from '@/types/messages';
import { chromeMock, setActiveTabUrl } from '../mocks/chrome';

const FOLLOWERS_URL = 'https://www.instagram.com/studio/followers/';

const ENTRIES = [
  {
    username: 'alice',
    profileUrl: 'https://www.instagram.com/alice/',
    displayName: 'Alice',
  },
  {
    username: 'bob',
    profileUrl: 'https://www.instagram.com/bob/',
  },
];

function renderRelationships() {
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

describe('relationship export page', () => {
  it('reads visible rows, filters, selects fields, and previews an export', async () => {
    setActiveTabUrl(FOLLOWERS_URL);
    const user = userEvent.setup();

    chromeMock.runtime.sendMessage.mockImplementation(
      (message: unknown, callback?: (response: unknown) => void) => {
        const request = message as BackgroundRequest;
        if (request.type === 'SITES_STATUS') {
          callback?.({
            ok: true,
            data: [
              {
                platform: 'instagram',
                label: 'Instagram',
                enabled: true,
                permissionGranted: true,
              },
            ],
          });
          return;
        }

        if (request.type === 'SCAN_TAB') {
          callback?.({
            ok: true,
            data: {
              platform: 'instagram',
              pageUrl: FOLLOWERS_URL,
              scannedAt: 1,
              pageType: 'unknown',
              items: [],
              limitations: [],
              relationships: ENTRIES,
              relationshipKind: 'followers',
            },
          });
          return;
        }

        callback?.({ ok: true, data: { entries: [], total: 0, hasMore: false } });
      },
    );

    renderRelationships();

    expect(
      await screen.findByRole('heading', { name: 'Relationship export' }),
    ).toBeTruthy();
    expect(await screen.findByText('Followers · visible page')).toBeTruthy();
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('@bob')).toBeTruthy();

    await user.type(
      screen.getByRole('textbox', { name: 'Filter relationship rows' }),
      'ali',
    );
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.queryByText('@bob')).toBeNull();

    await user.click(screen.getByRole('checkbox', { name: 'Display name' }));
    expect(
      screen.getByRole('button', { name: 'Export 1 rows' }),
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Export 1 rows' }));

    expect(await screen.findByText('Export relationship data?')).toBeTruthy();
    expect(screen.getByText(/Fields: username, profileUrl, displayName/)).toBeTruthy();
    expect(screen.getByText('No data leaves this device.')).toBeTruthy();
  });

  it('imports an official JSON export locally', async () => {
    const user = userEvent.setup();
    renderRelationships();

    await user.click(
      await screen.findByRole('button', { name: 'Official export file' }),
    );
    await user.selectOptions(screen.getByLabelText('List'), 'following');

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).toBeTruthy();

    fireEvent.change(input!, {
      target: {
        files: [
          new File(
            [
              JSON.stringify({
                relationships_following: [
                  {
                    title: '',
                    string_list_data: [
                      {
                        href: 'https://www.instagram.com/carol/',
                        value: 'carol',
                      },
                    ],
                  },
                ],
              }),
            ],
            'following.json',
            { type: 'application/json' },
          ),
        ],
      },
    });

    expect(await screen.findByText(/following\.json · 1 rows/)).toBeTruthy();
    expect(await screen.findByText('@carol')).toBeTruthy();
  });
});
