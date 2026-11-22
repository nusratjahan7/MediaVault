import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { App } from '@/dashboard/App';
import type { DashboardSnapshot } from '@/types/dashboard';
import type { HistoryEntry } from '@/types/history';
import type { BackgroundRequest } from '@/types/messages';
import { chromeMock } from '../mocks/chrome';

function entry(overrides: Partial<HistoryEntry>): HistoryEntry {
  return {
    id: 'entry',
    item: {
      id: 'instagram_1',
      platform: 'instagram',
      kind: 'video',
      url: 'https://cdn.example.com/video.mp4',
      thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
      author: 'studio',
      downloadable: true,
    },
    filename: 'MediaVault/instagram/posts/video.mp4',
    status: 'completed',
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const SNAPSHOT: DashboardSnapshot = {
  entries: [
    entry({
      id: 'active',
      status: 'downloading',
      bytesReceived: 50,
      totalBytes: 100,
      downloadId: 11,
      createdAt: 1,
      updatedAt: 5,
    }),
    entry({
      id: 'done',
      status: 'completed',
      downloadId: 77,
      totalBytes: 1_234,
      createdAt: 2,
      updatedAt: 4,
    }),
    entry({
      id: 'failed',
      status: 'failed',
      error: 'The link expired.',
      createdAt: 3,
      updatedAt: 3,
    }),
    entry({
      id: 'cancelled',
      status: 'cancelled',
      createdAt: 4,
      updatedAt: 2,
    }),
  ],
  counts: {
    queued: 0,
    downloading: 1,
    completed: 1,
    failed: 1,
    cancelled: 1,
    interrupted: 0,
  },
  completedFiles: 1,
  completedBytes: 1_234,
  completedWithBytes: 1,
};

function renderDashboard() {
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

describe('download dashboard', () => {
  it('shows counts, queue progress, failure reasons, and supported actions', async () => {
    const user = userEvent.setup();
    chromeMock.runtime.sendMessage.mockImplementation(
      (message: unknown, callback?: (response: unknown) => void) => {
        const request = message as BackgroundRequest;
        if (request.type === 'DASHBOARD_QUERY') {
          callback?.({ ok: true, data: SNAPSHOT });
          return;
        }
        if (request.type === 'RETRY_DOWNLOAD') {
          callback?.({ ok: true, data: { retried: true } });
          return;
        }
        if (request.type === 'CANCEL_DOWNLOAD') {
          callback?.({ ok: true, data: { cancelled: true } });
          return;
        }
        if (request.type === 'DASHBOARD_CLEAR_COMPLETED') {
          callback?.({ ok: true, data: { cleared: 1 } });
          return;
        }
        callback?.({ ok: false, error: { code: 'UNKNOWN', message: 'No response' } });
      },
    );

    renderDashboard();

    expect(
      await screen.findByRole('heading', { name: 'Download dashboard' }),
    ).toBeTruthy();
    expect(await screen.findByText('50%')).toBeTruthy();
    expect(screen.getByText('The link expired.')).toBeTruthy();
    expect(screen.getAllByText(/KB/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Open file' }));
    expect(chromeMock.downloads.open).toHaveBeenCalledWith(77);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getAllByRole('button', { name: 'Retry' })[0]!);

    expect(
      chromeMock.runtime.sendMessage.mock.calls.some(
        ([message]) => (message as { type?: string }).type === 'CANCEL_DOWNLOAD',
      ),
    ).toBe(true);
    expect(
      chromeMock.runtime.sendMessage.mock.calls.some(
        ([message]) => (message as { type?: string }).type === 'RETRY_DOWNLOAD',
      ),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: /Clear completed \(1\)/ }));
    expect(await screen.findByText('Clear completed dashboard entries?')).toBeTruthy();
    await user.click(
      screen.getAllByRole('button', { name: 'Clear completed' }).at(-1)!,
    );

    expect(await screen.findByText('Completed entries cleared')).toBeTruthy();
    expect(
      chromeMock.runtime.sendMessage.mock.calls.some(
        ([message]) =>
          (message as { type?: string }).type === 'DASHBOARD_CLEAR_COMPLETED',
      ),
    ).toBe(true);
  });
});
