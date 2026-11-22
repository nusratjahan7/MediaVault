export type ExtensionPage = 'history.html' | 'accounts.html' | 'options.html';

export function openExtensionPage(page: ExtensionPage): void {
  try {
    void chrome.tabs.create({ url: chrome.runtime.getURL(page) });
  } catch {
    // Navigation is best-effort; the surrounding UI stays usable.
  }
}
