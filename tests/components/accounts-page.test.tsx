import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '@/accounts/App';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getSelectedPreviewAccounts } from '@/mocks/preview-preferences';
import { saveSettings } from '@/storage/settings';

function renderAccounts() {
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

describe('account selection page', () => {
  it('shows default selections and persists a new preview account', async () => {
    await saveSettings({ demoMode: true });
    const user = userEvent.setup();

    renderAccounts();

    expect(await screen.findByRole('heading', { name: 'Account selection' })).toBeTruthy();
    expect(await screen.findByText('UI preview.')).toBeTruthy();
    expect(screen.getByText('3 of 3 platforms configured')).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: 'Selected for preview' }),
    ).toHaveLength(3);

    await user.click(screen.getAllByRole('button', { name: 'Use for previews' })[0]!);

    expect(await screen.findByText('Maya Chen selected')).toBeTruthy();
    expect((await getSelectedPreviewAccounts()).instagram).toBe('ig-maya');
    expect(
      screen.getAllByRole('button', { name: 'Selected for preview' }),
    ).toHaveLength(3);
  });
});
