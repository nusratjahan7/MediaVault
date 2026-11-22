import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountCard } from '@/components/accounts/AccountCard';
import { MOCK_ACCOUNTS } from '@/mocks/accounts';

afterEach(() => {
  cleanup();
});

describe('AccountCard', () => {
  it('renders account details and selects the preview account', async () => {
    const account = MOCK_ACCOUNTS[0]!;
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<AccountCard account={account} selected={false} onSelect={onSelect} />);

    expect(screen.getByText('Maya Chen')).toBeTruthy();
    expect(screen.getByText('@maya.chen')).toBeTruthy();
    expect(screen.getByText('Personal')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Use for previews' }));
    expect(onSelect).toHaveBeenCalledWith(account);
  });

  it('shows the selected state', () => {
    const account = MOCK_ACCOUNTS[1]!;

    render(<AccountCard account={account} selected onSelect={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Selected for preview' })).toBeTruthy();
  });
});
