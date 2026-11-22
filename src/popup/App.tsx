import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import { getAdapterForUrl } from '@/adapters/registry';
import { PageContextCard } from '@/components/context/PageContextCard';
import { PlatformBadge } from '@/components/media/PlatformBadge';
import type { MediaFilter } from '@/components/media/MediaFilters';
import { QueuePreview } from '@/components/queue/QueuePreview';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PLATFORM_IDS, PLATFORM_META } from '@/constants';
import { useActiveTab } from '@/hooks/useActiveTab';
import { useDownloads } from '@/hooks/useDownloads';
import { usePreviewAccount } from '@/hooks/usePreviewAccount';
import { useQueuePreview } from '@/hooks/useQueuePreview';
import { useScan, type ScanController } from '@/hooks/useScan';
import { useSelection } from '@/hooks/useSelection';
import { useSettings } from '@/hooks/useSettings';
import { useSiteAccess } from '@/hooks/useSiteAccess';
import { useToast } from '@/hooks/useToast';
import { getMockPageContext } from '@/mocks/pages';
import { getMockScanResult } from '@/mocks/media';
import { openExtensionPage } from '@/services/navigation';
import type { MediaItem } from '@/types/media';
import type { PlatformId } from '@/types/platform';
import type { PageContext } from '@/types/ui';
import { getErrorMessage } from '@/utils/errors';
import { buildCaptionExport, copyText } from '@/utils/export';
import { inferPageKind } from '@/utils/page-context';
import { DemoToolbar } from './DemoToolbar';
import { PopupHeader } from './PopupHeader';
import { ScanView } from './ScanView';
import { SiteAccessGate } from './SiteAccessGate';

export function App() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const demo = settings.demoMode;

  const [demoPlatform, setDemoPlatform] = useState<PlatformId>('instagram');
  const [filter, setFilter] = useState<MediaFilter>('all');
  const [selectionMode, setSelectionMode] = useState(false);

  const { tab, url, loading: tabLoading } = useActiveTab();
  const liveAdapter = useMemo(() => (url ? getAdapterForUrl(url) : undefined), [url]);
  const livePlatform = liveAdapter?.id ?? null;

  const siteAccess = useSiteAccess(demo ? null : livePlatform, tab?.id);
  const liveScan = useScan(
    demo ? null : (tab?.id ?? null),
    !demo && (siteAccess.status?.enabled ?? false),
    !demo && settings.autoScan,
  );

  const previewAccount = usePreviewAccount(demoPlatform);
  const mockScanResult = useMemo(() => getMockScanResult(demoPlatform), [demoPlatform]);
  const mockScan = useMemo<ScanController>(
    () => ({
      state: 'success',
      result: mockScanResult,
      error: null,
      scan: async () => undefined,
    }),
    [mockScanResult],
  );
  const mockPageContext = useMemo(
    () => getMockPageContext(demoPlatform, previewAccount),
    [demoPlatform, previewAccount],
  );

  const scan = demo ? mockScan : liveScan;
  const items = useMemo(() => scan.result?.items ?? [], [scan.result]);
  const selection = useSelection(items);
  const downloads = useDownloads();
  const queue = useQueuePreview(demo);

  const livePageContext = useMemo<PageContext | null>(() => {
    if (demo || !livePlatform || !url || !liveScan.result) {
      return null;
    }

    const first =
      liveScan.result.items.find((item) => item.author) ?? liveScan.result.items[0];
    const account = liveScan.result.account ?? undefined;
    const caption = liveScan.result.items.find(
      (item) => item.caption && item.caption !== 'Profile picture',
    )?.caption;

    return {
      platform: livePlatform,
      author: account?.username ?? first?.author,
      accountName: account?.displayName ?? account?.username ?? first?.author,
      handle: account?.username ?? first?.author,
      pageTitle: caption ?? url.pathname,
      pageUrl: liveScan.result.pageUrl,
      pageKind: liveScan.result.pageType ?? inferPageKind(url),
      mediaCount: liveScan.result.items.length,
      capturedAt: liveScan.result.scannedAt,
      mode: 'live',
    };
  }, [demo, livePlatform, url, liveScan.result]);

  const pageContext = demo ? mockPageContext : livePageContext;
  const downloadableItems = useMemo(
    () => items.filter((item) => item.downloadable),
    [items],
  );
  const currentItem = downloadableItems[0];

  useEffect(() => {
    setFilter('all');
    setSelectionMode(false);
  }, [scan.result?.pageUrl, demoPlatform, demo]);

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

  const openHistory = useCallback(() => {
    openExtensionPage('history.html');
  }, []);

  const openAccounts = useCallback(() => {
    openExtensionPage('accounts.html');
  }, []);

  const enablePreview = useCallback(async () => {
    try {
      await updateSettings({ demoMode: true });
      toast({
        title: 'UI preview enabled',
        description: 'Showing sample data. Downloads are simulated.',
        variant: 'success',
      });
    } catch (caught) {
      toast({
        title: 'Could not enable preview',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    }
  }, [toast, updateSettings]);

  const exitPreview = useCallback(() => {
    void updateSettings({ demoMode: false });
  }, [updateSettings]);

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

    if (livePlatform) {
      toast({
        title: `${PLATFORM_META[livePlatform].label} enabled`,
        description: 'Scanning this page now.',
        variant: 'success',
      });
    }

    await siteAccess.refresh();
  }, [livePlatform, siteAccess, toast]);

  const { enqueue: enqueueLive } = downloads;
  const addMockMedia = queue.addMockMedia;
  const clearSelection = selection.clear;

  const handleExportCaption = useCallback(async () => {
    const result = scan.result;
    const caption =
      result?.items.find(
        (item) => item.caption && item.caption !== 'Profile picture',
      )?.caption ?? pageContext?.pageTitle;
    const author =
      pageContext?.handle ??
      pageContext?.author ??
      result?.account?.username;
    const sourceUrl = pageContext?.pageUrl ?? result?.pageUrl;

    const copied = await copyText(
      buildCaptionExport({ caption, author, sourceUrl }),
    );

    toast({
      title: copied ? 'Caption copied' : 'Could not copy',
      description: copied
        ? 'Caption, account, and source URL are on your clipboard.'
        : 'Clipboard access is unavailable in this context.',
      variant: copied ? 'success' : 'error',
    });
  }, [pageContext, scan.result, toast]);

  const queueMedia = useCallback(
    async (target: MediaItem[]) => {
      if (target.length === 0) {
        return;
      }

      if (demo) {
        addMockMedia?.(target);
        clearSelection();
        setSelectionMode(false);
        toast({
          title: `Preview: ${target.length} ${
            target.length === 1 ? 'item' : 'items'
          } queued`,
          description: 'Demo mode — no files are downloaded and nothing leaves this device.',
          variant: 'success',
        });
        return;
      }

      const result = await enqueueLive(target);

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
          title:
            result.alreadyDownloaded > 0
              ? 'Already downloaded'
              : 'Nothing to download',
          description:
            result.alreadyDownloaded > 0
              ? 'Skip Downloaded is enabled and these items are already in your history.'
              : 'The selected items have no direct file link.',
          variant: result.alreadyDownloaded > 0 ? 'default' : 'error',
        });
        return;
      }

      clearSelection();
      setSelectionMode(false);

      const notes: string[] = [];
      if (result.alreadyDownloaded > 0) {
        notes.push(`${result.alreadyDownloaded} already downloaded.`);
      }
      if (result.skipped > 0) {
        notes.push(`${result.skipped} skipped because they have no direct link.`);
      }

      toast({
        title: `${result.accepted.length} ${
          result.accepted.length === 1 ? 'download' : 'downloads'
        } queued`,
        description:
          notes.length > 0
            ? notes.join(' ')
            : 'Progress appears below. Files are saved to your download folder.',
        variant: 'success',
      });
    },
    [addMockMedia, clearSelection, demo, enqueueLive, toast],
  );

  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection();
      setSelectionMode(false);
      return;
    }
    setSelectionMode(true);
  };

  const content = (() => {
    if (!demo) {
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

      if (!url || !livePlatform) {
        return (
          <div className="space-y-3 p-3">
            <EmptyState
              icon={<Globe2 className="size-5" aria-hidden="true" />}
              title="Not a supported page"
              description="Open a post, photo, reel, or video on Instagram, Facebook, or TikTok, then click MediaVault again. You can also explore the full interface with sample data."
            />
            <Button
              variant="secondary"
              size="sm"
              block
              onClick={() => {
                void enablePreview();
              }}
              icon={<Sparkles className="size-3.5" aria-hidden="true" />}
            >
              Preview the interface
            </Button>
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
          <div>
            <SiteAccessGate
              platform={livePlatform}
              busy={siteAccess.busy}
              error={siteAccess.error}
              onEnable={() => {
                void handleEnable();
              }}
            />
            <div className="px-4 pb-4">
              <Button
                variant="ghost"
                size="sm"
                block
                onClick={() => {
                  void enablePreview();
                }}
                icon={<Sparkles className="size-3.5" aria-hidden="true" />}
              >
                Preview with demo data
              </Button>
            </div>
          </div>
        );
      }
    }

    return (
      <div>
        {pageContext && (
          <div className="animate-rise space-y-1.5 px-3 pt-3">
            <PageContextCard
              context={pageContext}
              account={demo ? previewAccount : undefined}
              onSwitchAccount={demo ? openAccounts : undefined}
              compact
            />
            {pageContext.platform === 'instagram' && (
              <Button
                variant="ghost"
                size="sm"
                block
                onClick={() => {
                  void handleExportCaption();
                }}
                icon={<Copy className="size-3.5" aria-hidden="true" />}
              >
                Copy caption & source URL
              </Button>
            )}
          </div>
        )}

        {queue.items.length > 0 && (
          <div className="animate-rise px-3 pt-3">
            <QueuePreview
              controller={queue}
              limit={2}
              onViewAll={openHistory}
            />
          </div>
        )}

        <ScanView
          scan={scan}
          filter={filter}
          onFilterChange={setFilter}
          selection={selection}
          downloads={downloads}
          selectionMode={selectionMode}
          onToggleSelection={toggleSelectionMode}
          onDownloadCurrent={() => {
            if (currentItem) {
              void queueMedia([currentItem]);
            }
          }}
          onBulkDownload={() => {
            void queueMedia(downloadableItems);
          }}
          onDownload={() => {
            void queueMedia(selection.selectedItems);
          }}
          onOpenLibrary={() => {
            void openLibrary();
          }}
        />
      </div>
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

      {demo && (
        <DemoToolbar
          platform={demoPlatform}
          onPlatformChange={setDemoPlatform}
          onExit={exitPreview}
        />
      )}

      <main className="mv-scrollbar flex-1 overflow-y-auto">{content}</main>

      <footer className="flex items-center justify-center gap-1.5 border-t border-border bg-surface px-3 py-2 text-[10px] text-muted">
        <ShieldCheck className="size-3 text-success" aria-hidden="true" />
        {demo ? 'Demo data · nothing is downloaded or uploaded' : 'Local only. Nothing is uploaded.'}
      </footer>
    </div>
  );
}
