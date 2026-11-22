import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Sparkles, Users } from 'lucide-react';
import { AccountCard } from '@/components/accounts/AccountCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoBanner } from '@/components/ui/DemoBanner';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { PLATFORM_IDS, PLATFORM_META } from '@/constants';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';
import {
  DEFAULT_PREVIEW_ACCOUNT_IDS,
  getMockAccounts,
  MOCK_ACCOUNTS,
} from '@/mocks/accounts';
import {
  getSelectedPreviewAccounts,
  selectPreviewAccount,
  subscribeToPreviewAccounts,
  type SelectedPreviewAccounts,
} from '@/mocks/preview-preferences';
import type { PlatformId } from '@/types/platform';
import type { PreviewAccount } from '@/types/ui';
import { getErrorMessage } from '@/utils/errors';

type AccountFilter = 'all' | PlatformId;

export function PreviewAccountsView() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const demo = settings.demoMode;

  const [filter, setFilter] = useState<AccountFilter>('all');
  const [selected, setSelected] = useState<SelectedPreviewAccounts>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getSelectedPreviewAccounts().then((next) => {
      if (active) {
        setSelected(next);
      }
    });

    const unsubscribe = subscribeToPreviewAccounts(setSelected);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const selectedCount = useMemo(
    () =>
      PLATFORM_IDS.filter(
        (platform) =>
          (selected[platform] ?? DEFAULT_PREVIEW_ACCOUNT_IDS[platform]).length > 0,
      ).length,
    [selected],
  );

  const isSelected = (account: PreviewAccount): boolean =>
    (selected[account.platform] ?? DEFAULT_PREVIEW_ACCOUNT_IDS[account.platform]) ===
    account.id;

  const accounts = filter === 'all' ? MOCK_ACCOUNTS : getMockAccounts(filter);

  const handleSelect = async (account: PreviewAccount) => {
    setBusyId(account.id);

    try {
      await selectPreviewAccount(account.platform, account.id);
      setSelected((previous) => ({ ...previous, [account.platform]: account.id }));
      toast({
        title: `${account.displayName} selected`,
        description: `Preview context for ${PLATFORM_META[account.platform].label} updated.`,
        variant: 'success',
      });
    } catch (caught) {
      toast({
        title: 'Could not select account',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const enablePreview = async () => {
    try {
      await updateSettings({ demoMode: true });
      toast({
        title: 'UI preview enabled',
        description: 'Sample data is now visible across the popup, library, and history.',
        variant: 'success',
      });
    } catch (caught) {
      toast({
        title: 'Could not enable preview',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-4">
      {demo && <DemoBanner />}

      {!demo && (
        <Card className="border-accent/25 bg-accent/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-fg">
                  Account selection is a UI preview
                </p>
                <p className="mt-0.5 max-w-[70ch] text-[11px] leading-relaxed text-muted">
                  MediaVault never reads platform sessions, cookies, or credentials. Enable the
                  preview to see how account context flows through the popup and library.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => void enablePreview()} className="shrink-0">
              Enable UI preview
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          value={filter}
          options={[
            { value: 'all', label: `All ${MOCK_ACCOUNTS.length}` },
            ...PLATFORM_IDS.map((platform) => ({
              value: platform,
              label: PLATFORM_META[platform].label,
            })),
          ]}
          onChange={setFilter}
          ariaLabel="Filter accounts by platform"
          className="w-full sm:w-auto"
        />
        <p className="flex items-center gap-1.5 text-[11px] text-muted">
          <Users className="size-3.5" aria-hidden="true" />
          {selectedCount} of 3 platforms configured
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            selected={isSelected(account)}
            onSelect={(next) => {
              void handleSelect(next);
            }}
            busy={busyId === account.id}
          />
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-fg">No account access</p>
            <p className="mt-0.5 max-w-[80ch] text-[11px] leading-relaxed text-muted">
              These are sample profiles. MediaVault does not sign in, store credentials, read
              private messages, or access account data. In live use, page context comes only
              from media that is already visible on the page you opened.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Badge tone="neutral">Preview only</Badge>
      </div>
    </div>
  );
}
