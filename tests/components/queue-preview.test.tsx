import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueuePreview } from '@/components/queue/QueuePreview';
import { createInitialMockQueue } from '@/mocks/queue';
import type { QueuePreviewController } from '@/types/ui';

function controller(
  overrides: Partial<QueuePreviewController> = {},
): QueuePreviewController {
  return {
    mode: 'demo',
    items: createInitialMockQueue(),
    loading: false,
    error: null,
    refresh: () => undefined,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('QueuePreview', () => {
  it('renders active queue rows, progress, and the demo badge', () => {
    render(<QueuePreview controller={controller()} limit={2} />);

    expect(screen.getByText('Download queue')).toBeTruthy();
    expect(screen.getByText('Demo')).toBeTruthy();
    expect(screen.getByText('3 active')).toBeTruthy();
    expect(screen.getByText('facebook-atlasfilms-lake-house.jpg')).toBeTruthy();
    expect(screen.getByText('tiktok-studio.north-lighting-tricks.mp4')).toBeTruthy();
    expect(screen.queryByText('instagram-studio.north-golden-hour.jpg')).toBeNull();
  });

  it('opens the full history page from the footer action', async () => {
    const onViewAll = vi.fn();
    const user = userEvent.setup();

    render(<QueuePreview controller={controller()} onViewAll={onViewAll} />);
    await user.click(screen.getByRole('button', { name: 'View all downloads' }));

    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('shows a clear empty state', () => {
    render(<QueuePreview controller={controller({ items: [], mode: 'live' })} />);

    expect(screen.getByText('Queue is clear')).toBeTruthy();
  });

  it('shows a retry action when the live queue fails', async () => {
    const refresh = vi.fn();
    const user = userEvent.setup();

    render(
      <QueuePreview
        controller={controller({ items: [], mode: 'live', error: 'Service unavailable', refresh })}
      />,
    );

    expect(screen.getByText('Queue unavailable.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('exposes pause and cancel actions for active downloads', async () => {
    const onPause = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <QueuePreview
        controller={controller({ mode: 'live' })}
        limit={1}
        onPause={onPause}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Pause download' }));
    await user.click(screen.getByRole('button', { name: 'Cancel download' }));

    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('summarizes failures in the queue header', () => {
    render(
      <QueuePreview
        controller={controller({
          mode: 'live',
          items: [
            {
              id: 'failed-one',
              platform: 'instagram',
              kind: 'image',
              filename: 'failed.jpg',
              status: 'failed',
              error: 'Expired link',
              createdAt: 1,
            },
          ],
        })}
      />,
    );

    expect(screen.getByText('1 failure')).toBeTruthy();
  });
});
