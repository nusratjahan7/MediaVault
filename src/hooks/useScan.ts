import { useCallback, useEffect, useRef, useState } from 'react';
import { scanTab } from '@/services/scan';
import type { ScanResult } from '@/types/media';
import { getErrorMessage } from '@/utils/errors';

export type ScanState = 'idle' | 'scanning' | 'success' | 'empty' | 'error';

export interface ScanController {
  state: ScanState;
  result: ScanResult | null;
  error: string | null;
  scan: () => Promise<void>;
}

export function useScan(
  tabId: number | null,
  enabled: boolean,
  autoScan: boolean,
): ScanController {
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const scan = useCallback(async () => {
    if (tabId === null) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState('scanning');
    setError(null);

    try {
      const next = await scanTab(tabId);
      if (requestId !== requestIdRef.current) {
        return;
      }

      setResult(next);
      setState(next.items.length > 0 ? 'success' : 'empty');
    } catch (caught) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(getErrorMessage(caught));
      setState('error');
    }
  }, [tabId]);

  useEffect(() => {
    if (tabId !== null && enabled && autoScan) {
      void scan();
    }
  }, [tabId, enabled, autoScan, scan]);

  return { state, result, error, scan };
}
