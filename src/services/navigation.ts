export type ExtensionPage =
  | 'history.html'
  | 'accounts.html'
  | 'stories.html'
  | 'options.html';

export function openExtensionPage(
  page: ExtensionPage,
  params?: Record<string, string | number>,
): void {
  try {
    const url = new URL(chrome.runtime.getURL(page));
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, String(value));
    }
    void chrome.tabs.create({ url: url.toString() });
  } catch {
    // Navigation is best-effort; the surrounding UI stays usable.
  }
}
