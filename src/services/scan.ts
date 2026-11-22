import type { ScanResult } from '@/types/media';
import { fromErrorPayload } from '@/utils/errors';
import { sendToBackground } from './messaging';

export async function scanTab(tabId: number): Promise<ScanResult> {
  const response = await sendToBackground({ type: 'SCAN_TAB', tabId });
  if (!response.ok) {
    throw fromErrorPayload(response.error);
  }

  return response.data;
}
