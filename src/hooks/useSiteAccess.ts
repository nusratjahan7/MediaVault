import { useCallback, useEffect, useState } from 'react';
import {
  getSiteStatuses,
  requestSiteAccess,
  revokeSiteAccess,
} from '@/services/permissions';
import type { PlatformId, SiteStatus } from '@/types/platform';
import { getErrorMessage } from '@/utils/errors';

export interface SiteAccessResult {
  ok: boolean;
  error?: string;
}

export interface SiteAccessState {
  status: SiteStatus | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  enable: () => Promise<SiteAccessResult>;
  disable: () => Promise<SiteAccessResult>;
}

export function useSiteAccess(
  platform: PlatformId | null,
  tabId?: number,
): SiteAccessState {
  const [status, setStatus] = useState<SiteStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!platform) {
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const statuses = await getSiteStatuses();
      setStatus(statuses.find((entry) => entry.platform === platform) ?? null);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async (): Promise<SiteAccessResult> => {
    if (!platform) {
      return { ok: false, error: 'This site is not supported.' };
    }

    setBusy(true);
    setError(null);

    try {
      const next = await requestSiteAccess(platform, tabId);
      setStatus(next);
      return { ok: true };
    } catch (caught) {
      const message = getErrorMessage(caught);
      setError(message);
      return { ok: false, error: message };
    } finally {
      setBusy(false);
    }
  }, [platform, tabId]);

  const disable = useCallback(async (): Promise<SiteAccessResult> => {
    if (!platform) {
      return { ok: false, error: 'This site is not supported.' };
    }

    setBusy(true);
    setError(null);

    try {
      const next = await revokeSiteAccess(platform);
      setStatus(next);
      return { ok: true };
    } catch (caught) {
      const message = getErrorMessage(caught);
      setError(message);
      return { ok: false, error: message };
    } finally {
      setBusy(false);
    }
  }, [platform]);

  return { status, loading, busy, error, refresh, enable, disable };
}
