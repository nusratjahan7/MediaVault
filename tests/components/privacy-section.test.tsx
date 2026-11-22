import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { GhostModeSection } from '@/options/sections/GhostModeSection';
import { PrivacySection } from '@/options/sections/PrivacySection';
import { createSavedList, getSavedLists } from '@/storage/lists';
import type { BackgroundRequest } from '@/types/messages';
import { chromeMock } from '../mocks/chrome';

function renderPrivacy() {
  return render(
    <SettingsProvider>
      <ToastProvider>
        <PrivacySection />
      </ToastProvider>
    </SettingsProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe('privacy settings and Ghost Mode', () => {
  it('shows local-only status, permission explanations, and clears saved lists', async () => {
    await createSavedList('Local list', 'instagram');
    const user = userEvent.setup();

    chromeMock.runtime.sendMessage.mockImplementation(
      (message: unknown, callback?: (response: unknown) => void) => {
        const request = message as BackgroundRequest;
        if (request.type === 'HISTORY_QUERY') {
          callback?.({
            ok: true,
            data: { entries: [], total: 2, hasMore: false },
          });
          return;
        }

        if (request.type === 'SITES_STATUS') {
          callback?.({
            ok: true,
            data: [
              {
                platform: 'instagram',
                label: 'Instagram',
                enabled: false,
                permissionGranted: false,
              },
            ],
          });
          return;
        }

        callback?.({ ok: false, error: { code: 'UNKNOWN', message: 'No response' } });
      },
    );

    renderPrivacy();

    expect(await screen.findByText('Local-only mode')).toBeTruthy();
    expect(screen.getAllByText('Enforced').length).toBeGreaterThan(0);
    expect(await screen.findByText('Permission overview')).toBeTruthy();
    expect(screen.getByText('storage')).toBeTruthy();
    expect(screen.getByText('downloads')).toBeTruthy();
    expect(screen.getByText('Clear history automatically')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Clear saved lists' }));
    expect(await screen.findByText('Clear saved account lists?')).toBeTruthy();
    const confirm = screen.getAllByRole('button', { name: 'Clear saved lists' }).at(-1);
    await user.click(confirm!);

    expect(await screen.findByText('Saved account lists cleared')).toBeTruthy();
    await expect(getSavedLists()).resolves.toEqual([]);
  });

  it('does not claim anonymity and links to official privacy settings', () => {
    render(
      <SettingsProvider>
        <ToastProvider>
          <GhostModeSection />
        </ToastProvider>
      </SettingsProvider>,
    );

    expect(screen.getByText('Ghost Mode')).toBeTruthy();
    expect(screen.getByText('No anonymity guarantee')).toBeTruthy();
    expect(screen.getByText(/does not hide story views/i)).toBeTruthy();
    expect(screen.getByText(/does not hide DM read receipts/i)).toBeTruthy();

    const instagram = screen.getByRole('link', { name: /Instagram privacy/i });
    expect(instagram.getAttribute('href')).toContain('instagram.com');
    expect(
      screen.getByRole('link', { name: /TikTok privacy/i }).getAttribute('href'),
    ).toContain('tiktok.com');
  });
});
