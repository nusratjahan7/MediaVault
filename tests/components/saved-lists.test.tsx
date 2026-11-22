import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '@/accounts/App';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { getSavedLists } from '@/storage/lists';
import { chromeMock } from '../mocks/chrome';

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

describe('saved lists manager', () => {
  it('creates a list, adds a profile, selects it, and starts a profile workflow', async () => {
    const user = userEvent.setup();
    renderAccounts();

    await user.click(await screen.findByRole('button', { name: 'New list' }));
    await user.type(screen.getByLabelText('List name'), 'Fashion Inspiration');
    await user.selectOptions(screen.getByLabelText('Platform'), 'instagram');
    await user.click(screen.getByRole('button', { name: 'Create list' }));

    expect((await screen.findAllByText('Fashion Inspiration')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Add profile' }));
    await user.type(screen.getByLabelText('Username'), '@example');
    await user.type(screen.getByLabelText('Display name (optional)'), 'Example');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));

    const savedLists = await getSavedLists();
    expect(savedLists[0]?.accounts[0]?.username).toBe('example');
    expect(await screen.findByText('Example')).toBeTruthy();

    await user.click(screen.getByRole('checkbox', { name: 'Select example' }));
    await user.click(
      screen.getByRole('button', { name: 'Start workflow (1)' }),
    );

    expect(await screen.findByText(/Profile 1 of 1/)).toBeTruthy();
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({
      url: 'https://www.instagram.com/example/',
    });
  });

  it('confirms export and rejects malformed import JSON', async () => {
    const user = userEvent.setup();
    renderAccounts();

    await user.click(await screen.findByRole('button', { name: 'New list' }));
    await user.type(screen.getByLabelText('List name'), 'Exportable');
    await user.click(screen.getByRole('button', { name: 'Create list' }));
    expect((await screen.findAllByText('Exportable')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Export JSON' }));
    expect(await screen.findByText('Export saved lists?')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).toBeTruthy();

    fireEvent.change(input!, {
      target: {
        files: [new File(['{oops'], 'bad.json', { type: 'application/json' })],
      },
    });
    expect(await screen.findByText('Import rejected')).toBeTruthy();
    expect(screen.queryByText('Import saved lists?')).toBeNull();
  });

  it('confirms a valid import before saving', async () => {
    const user = userEvent.setup();
    renderAccounts();
    await screen.findByText('No saved lists yet');

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).toBeTruthy();

    fireEvent.change(input!, {
      target: {
        files: [
          new File(
            [
              JSON.stringify({
                name: 'Imported',
                platform: 'tiktok',
                accounts: [{ username: 'creator' }],
              }),
            ],
            'lists.json',
            { type: 'application/json' },
          ),
        ],
      },
    });

    expect(await screen.findByText('Import saved lists?')).toBeTruthy();
    expect(screen.getByText('Imported')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Import lists' }));
    expect(await screen.findByText('Lists imported')).toBeTruthy();
    expect(await getSavedLists()).toHaveLength(1);
  });
});
