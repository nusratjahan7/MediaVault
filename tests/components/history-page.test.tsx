import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { App } from '@/history/App';
import { saveSettings } from '@/storage/settings';

function renderHistory() {
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

describe('history page', () => {
  it('renders the demo history, stats, filters, and preview banner', async () => {
    await saveSettings({ demoMode: true });

    renderHistory();

    expect(await screen.findByRole('heading', { name: 'Download history' })).toBeTruthy();
    expect(await screen.findByText('UI preview.')).toBeTruthy();
    expect(screen.getByText('Demo data')).toBeTruthy();
    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getAllByText('Saved').length).toBeGreaterThan(0);
    expect(screen.getByText('Attention')).toBeTruthy();
    expect(screen.getByLabelText('Search downloads')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Clear history' })).toBeTruthy();
    expect(
      screen.getAllByRole('button', { name: 'Remove from history' }).length,
    ).toBeGreaterThan(0);
  });
});
