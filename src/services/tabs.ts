import { safeUrl } from '@/utils/url';

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  } catch {
    return undefined;
  }
}

export function getTabUrl(tab: chrome.tabs.Tab | undefined): URL | null {
  return safeUrl(tab?.url);
}
