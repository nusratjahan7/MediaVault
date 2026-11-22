import 'fake-indexeddb/auto';
import { beforeEach } from 'vitest';
import { installChromeMock, resetChromeMock } from './mocks/chrome';

installChromeMock();

if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

beforeEach(async () => {
  resetChromeMock();

  const { deleteDbForTests } = await import('@/storage/db');
  await deleteDbForTests();

  const { resetSettingsCacheForTests } = await import('@/storage/settings');
  resetSettingsCacheForTests();

  const { resetDownloadQueueForTests } = await import('@/downloads/queue');
  resetDownloadQueueForTests();
});
