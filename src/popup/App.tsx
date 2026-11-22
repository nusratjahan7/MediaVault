import { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe2, ShieldCheck } from 'lucide-react';
import { getAdapterForUrl } from '@/adapters/registry';
import { PLATFORM_IDS, PLATFORM_META } from '@/constants';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PlatformBadge } from '@/components/media/PlatformBadge';
import type { MediaFilter } from '@/components/media/MediaFilters';
import { useActiveTab } from '@/hooks/useActiveTab';
import { useDownloads } from '@/hooks/useDownloads';
import { useScan } from '@/hooks/useScan';
import { useSelection } from '@/hooks/useSelection';
import { useSettings } from '@/hooks/useSettings';
import { useSiteAccess } from '@/hooks/useSiteAccess';
import { useToast } from '@/hooks/useToast';
import { PopupHeader } from './PopupHeader';
import { ScanView } from './ScanView';
import { SiteAccessGate } from './SiteAccessGate';

export function App() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const { tab, url, loading: tabLoading } = useActiveTab();
  const adapter = useMemo(() => (url ? getAdapterForUrl(url) : undefined), [url]);
  const platform = adapter?.id ?? null;
  const siteAccess = useSiteAccess(platform, tab?.id);

  const scan = useScan(
    tab?.id ?? null,
    siteAccess.status?.enabled ?? false,
    settings.autoScan,
  );
  const selection = useSelection(scan.result?.items ?? []);
  const downloads = useDownloads();

  const [filter, setFilter] = useState<MediaFilter>('all');

  useEffect(() => {
    setFilter('all');
  }, [scan.result?.pageUrl]);

  const openSettings = useCallback(() => {
    void chrome.runtime.openOptionsPage().finally(() => window.close());
  }, []);

  const openLibrary = useCallback(async () => {
    if (!chrome.sidePanel || typeof chrome.sidePanel.open !== 'function') {
      toast({
        title: 'Side panel unavailable',
        description: 'Update Chrome to use the MediaVault library.',
        variant: 'error',
      });
      return;
    }

    try {
      await chrome.sidePanel.open({
        windowId: tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT,
      });
      window.close();
    } catch {
      toast({
        title: 'Could not open the library',
        description: 'Open the side panel from Chrome’s toolbar instead.',
        variant: 'error',
      });
    }
  }, [tab?.windowId, toast]);

  const handleEnable = useCallback(async () => {
    const result = await siteAccess.enable();

    if (!result.ok) {
      toast({
        title: 'Site access not granted',
        description: result.error ?? 'MediaVault needs permission to scan this page.',
        variant: 'error',
      });
      return;
    }

    if (platform) {
      toast({
        title: `${PLATFORM_META[platform].label} enabled`,
        description: 'Scanning this page now.',
        variant: 'success',
      });
    }

    await siteAccess.refresh();
  }, [platform, siteAccess, toast]);

  const handleDownload = useCallback(async () => {
    if (selection.selectedItems.length === 0) {
      return;
    }

    const result = await downloads.enqueue(selection.selectedItems);

    if (!result) {
      toast({
        title: 'Download could not start',
        description: 'Try scanning again to refresh the media links.',
        variant: 'error',
      });
      return;
    }

    if (result.accepted.length === 0) {
      toast({
        title: 'Nothing to download',
        description: 'The selected items have no direct file link.',
        variant: 'error',
      });
      return;
    }

    selection.clear();
    toast({
      title: `${result.accepted.length} ${
        result.accepted.length === 1 ? 'download' : 'downloads'
      } queued`,
      description:
        result.skipped > 0
          ? `${result.skipped} item(s) skipped because they have no direct link.`
          : 'Progress appears below. Files are saved to your download folder.',
      variant: 'success',
    });
  }, [downloads, selection, toast]);

  const content = (() => {
    if (tabLoading) {
      return (
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      );
    }

    if (!url || !platform) {
      return (
        <div className="space-y-3 p-3">
          <EmptyState
            icon={<Globe2 className="size-5" aria-hidden="true" />}
            title="Not a supported page"
            description="Open a post, photo, reel, or video on Instagram, Facebook, or TikTok, then click MediaVault again."
          />
          <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
            <p className="text-[10px] font-medium tracking-wide text-muted uppercase">
              Supported platforms
            </p>
            {PLATFORM_IDS.map((id) => (
              <div key={id} className="flex items-center justify-between gap-2">
                <PlatformBadge platform={id} />
                <span className="max-w-[60%] text-right text-[10px] leading-tight text-muted">
                  {PLATFORM_META[id].description}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (siteAccess.loading && !siteAccess.status) {
      return (
        <div className="space-y-3 p-4">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
          <Skeleton className="h-9 w-full" />
        </div>
      );
    }

    if (!siteAccess.status?.enabled) {
      return (
        <SiteAccessGate
          platform={platform}
          busy={siteAccess.busy}
          error={siteAccess.error}
          onEnable={() => {
            void handleEnable();
          }}
        />
      );
    }

    return (
      <ScanView
        scan={scan}
        filter={filter}
        onFilterChange={setFilter}
        selection={selection}
        downloads={downloads}
        onDownload={() => {
          void handleDownload();
        }}
        onOpenLibrary={() => {
          void openLibrary();
        }}
      />
    );
  })();

  return (
    <div className="flex min-h-[520px] flex-col bg-bg">
      <PopupHeader
        onOpenLibrary={() => {
          void openLibrary();
        }}
        onOpenSettings={openSettings}
      />

      <main className="mv-scrollbar flex-1 overflow-y-auto">{content}</main>

      <footer className="flex items-center justify-center gap-1.5 border-t border-border bg-surface px-3 py-2 text-[10px] text-muted">
        <ShieldCheck className="size-3 text-success" aria-hidden="true" />
        Local only. Nothing is uploaded.
      </footer>
    </div>
  );
}
