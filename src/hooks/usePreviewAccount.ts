import { useEffect, useState } from 'react';
import { findMockAccount, getDefaultPreviewAccount } from '@/mocks/accounts';
import {
  getSelectedPreviewAccount,
  subscribeToPreviewAccounts,
} from '@/mocks/preview-preferences';
import type { PlatformId } from '@/types/platform';
import type { PreviewAccount } from '@/types/ui';

export function usePreviewAccount(platform: PlatformId): PreviewAccount {
  const [account, setAccount] = useState<PreviewAccount>(() =>
    getDefaultPreviewAccount(platform),
  );

  useEffect(() => {
    let active = true;
    setAccount(getDefaultPreviewAccount(platform));

    void getSelectedPreviewAccount(platform).then((next) => {
      if (active) {
        setAccount(next);
      }
    });

    const unsubscribe = subscribeToPreviewAccounts((selected) => {
      const accountId = selected[platform];
      if (!accountId) {
        return;
      }

      const next = findMockAccount(platform, accountId);
      if (next) {
        setAccount(next);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [platform]);

  return account;
}
