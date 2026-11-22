import { useEffect, useState } from 'react';
import {
  getTabSelection,
  saveTabSelection,
} from '@/storage/selection';
import type { MediaItem } from '@/types/media';
import type { PlatformId } from '@/types/platform';
import { useSelection, type SelectionController } from './useSelection';

/**
 * Selection persists per browser tab in chrome.storage.session so switching
 * between supported tabs (or reopening the popup) keeps the chosen items.
 * Items from other platforms remain selected; each download path still uses
 * its own platform folder.
 */
export function useTabSelection(
  items: MediaItem[],
  tabId: number | null,
  platform: PlatformId | null,
): SelectionController {
  const selection = useSelection(items);
  const [hydratedTab, setHydratedTab] = useState<number | null>(null);
  const { restore, selectedItems } = selection;

  useEffect(() => {
    let active = true;
    setHydratedTab(null);

    if (tabId === null) {
      restore([]);
      setHydratedTab(-1);
      return () => {
        active = false;
      };
    }

    void getTabSelection(tabId).then((stored) => {
      if (!active) {
        return;
      }

      restore(stored);
      setHydratedTab(tabId);
    });

    return () => {
      active = false;
    };
  }, [tabId, restore]);

  useEffect(() => {
    if (tabId === null || hydratedTab !== tabId) {
      return;
    }

    void saveTabSelection(tabId, platform, selectedItems);
  }, [hydratedTab, tabId, platform, selectedItems]);

  return selection;
}
