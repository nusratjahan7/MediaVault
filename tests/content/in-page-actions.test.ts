import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findInstagramActionTargets } from '@/adapters/instagram/in-page';
import { startInPageActions } from '@/content/in-page-actions';
import { setDocumentHtml } from '../helpers/dom';
import feedHtml from '../fixtures/instagram/feed.html?raw';

beforeEach(() => {
  setDocumentHtml(feedHtml);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('in-page actions', () => {
  it('injects a download button into the post action row and calls the handler', async () => {
    const onDownload = vi.fn(async () => ({
      message: 'Added 1 item to downloads.',
      tone: 'success' as const,
    }));
    const controller = startInPageActions({
      findTargets: () =>
        findInstagramActionTargets(document, new URL('https://www.instagram.com/')),
      onDownload,
    });

    controller.refresh();

    const host = document.querySelector<HTMLElement>('[data-mediavault-action]');
    expect(host).toBeTruthy();
    const button = host?.shadowRoot?.querySelector('button');
    expect(button).toBeTruthy();
    expect(button?.getAttribute('aria-label')).toBe('Download');
    expect(button?.getAttribute('title')).toBe('Download');

    button?.click();

    await vi.waitFor(() => {
      expect(onDownload).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(host?.dataset.mediavaultState).toBe('completed');
    });

    controller.destroy();
    expect(document.querySelector('[data-mediavault-action]')).toBeNull();
  });
});
