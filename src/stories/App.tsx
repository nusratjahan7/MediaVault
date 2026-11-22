import { useMemo } from 'react';
import {
  Clock3,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import { getAdapterForUrl } from '@/adapters/registry';
import { PageShell } from '@/components/layout/PageShell';
import { LimitationNotice } from '@/components/media/LimitationNotice';
import { HighlightCard } from '@/components/stories/HighlightCard';
import { StoryCard } from '@/components/stories/StoryCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useDownloadItems } from '@/hooks/useDownloadItems';
import { useScan } from '@/hooks/useScan';
import { useSettings } from '@/hooks/useSettings';
import { useSiteAccess } from '@/hooks/useSiteAccess';
import { useTargetTab } from '@/hooks/useTargetTab';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { openExtensionPage } from '@/services/navigation';
import type { AccountIdentity } from '@/types/page';
import type { HighlightMedia, StoryMedia } from '@/types/story';
import { getErrorMessage } from '@/utils/errors';
import { storyGroupKey } from '@/utils/story';

interface StoryGroup {
  key: string;
  account: AccountIdentity | null;
  stories: StoryMedia[];
}

export function App() {
  const { settings } = useSettings();
  const { resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const { busyKey, enqueue } = useDownloadItems();
  const {
    tab,
    url,
    loading: tabLoading,
    error: tabError,
    refresh: refreshTab,
  } = useTargetTab();

  const adapter = useMemo(() => (url ? getAdapterForUrl(url) : undefined), [url]);
  const platform = adapter?.id ?? null;
  const demo = settings.demoMode;

  const siteAccess = useSiteAccess(demo ? null : platform, tab?.id);
  const scan = useScan(
    demo ? null : (tab?.id ?? null),
    !demo && (siteAccess.status?.enabled ?? false),
    !demo && settings.autoScan,
  );

  const stories = useMemo(
    () => scan.result?.stories ?? [],
    [scan.result?.stories],
  );
  const highlights = useMemo(
    () => scan.result?.highlights ?? [],
    [scan.result?.highlights],
  );
  const limitations = useMemo(
    () => scan.result?.limitations ?? [],
    [scan.result?.limitations],
  );

  const groups = useMemo<StoryGroup[]>(() => {
    const map = new Map<string, StoryGroup>();

    for (const story of stories) {
      const key = storyGroupKey(story.account);
      const existing = map.get(key);

      if (existing) {
        existing.stories.push(story);
      } else {
        map.set(key, {
          key,
          account: story.account,
          stories: [story],
        });
      }
    }

    return [...map.values()];
  }, [stories]);

  const enableSite = async () => {
    const result = await siteAccess.enable();

    if (!result.ok) {
      toast({
        title: 'Site access not granted',
        description: result.error ?? 'MediaVault needs permission to read this page.',
        variant: 'error',
      });
      return;
    }

    await siteAccess.refresh();
  };

  const refreshAll = async () => {
    try {
      await refreshTab();
      await siteAccess.refresh();
      await scan.scan();
    } catch (caught) {
      toast({
        title: 'Could not refresh',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    }
  };

  const downloadStory = (story: StoryMedia) => {
    void enqueue([story.item], story.id, 'Story');
  };

  const downloadStoryGroup = (group: StoryGroup) => {
    const items = group.stories
      .filter((story) => story.available)
      .map((story) => story.item);

    void enqueue(items, `group:${group.key}`, `Stories from ${group.key}`);
  };

  const downloadHighlight = (highlight: HighlightMedia) => {
    void enqueue(highlight.items, `highlight:${highlight.id}`, highlight.title);
  };

  const downloadHighlightCover = (highlight: HighlightMedia) => {
    if (!highlight.cover) {
      return;
    }

    void enqueue(
      [highlight.cover],
      `cover:${highlight.id}`,
      `${highlight.title} cover`,
    );
  };

  const actions = (
    <>
      {demo && <Badge tone="accent">Demo data</Badge>}
      <IconButton
        label="Refresh stories and highlights"
        onClick={() => {
          void refreshAll();
        }}
      >
        <RefreshCw className="size-4" aria-hidden="true" />
      </IconButton>
      <IconButton
        label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={() => {
          void setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        }}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="size-4" aria-hidden="true" />
        ) : (
          <Moon className="size-4" aria-hidden="true" />
        )}
      </IconButton>
    </>
  );

  const content = (() => {
    if (tabLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }

    if (tabError) {
      return <ErrorState description={tabError} onRetry={() => void refreshAll()} />;
    }

    if (!url || !platform) {
      return (
        <EmptyState
          icon={<Users className="size-5" aria-hidden="true" />}
          title="Open a supported stories page"
          description="Open an Instagram, Facebook, or TikTok story, highlight, or profile page, then launch this manager from the popup. Profile pages expose accessible highlight trays."
        />
      );
    }

    if (demo) {
      return (
        <Card className="p-5">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 text-accent" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-fg">
                Stories require live page access
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Demo data mode is on. Turn it off in Settings to read stories and highlights
                that are visible in your current authorized session.
              </p>
              <Button
                size="sm"
                className="mt-3"
                variant="secondary"
                onClick={() => openExtensionPage('options.html')}
              >
                Open settings
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    if (siteAccess.loading && !siteAccess.status) {
      return <Skeleton className="h-40 w-full" />;
    }

    if (!siteAccess.status?.enabled) {
      return (
        <Card className="p-6 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-fg">
            Enable MediaVault on this site
          </h2>
          <p className="mx-auto mt-1.5 max-w-[48ch] text-xs leading-relaxed text-muted">
            Chrome needs one-time permission to read stories and highlights already visible on
            this page. MediaVault never signs in or bypasses private-account controls.
          </p>
          <Button
            size="sm"
            className="mt-4"
            loading={siteAccess.busy}
            onClick={() => void enableSite()}
          >
            Enable on this site
          </Button>
          {siteAccess.error && (
            <p className="mt-2 text-xs text-danger">{siteAccess.error}</p>
          )}
        </Card>
      );
    }

    if (scan.state === 'scanning') {
      return (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        </div>
      );
    }

    if (scan.state === 'error') {
      return (
        <ErrorState
          title="Could not scan stories"
          description={scan.error ?? 'Reload the page and try again.'}
          onRetry={() => void scan.scan()}
        />
      );
    }

    if (scan.state === 'idle') {
      return (
        <EmptyState
          icon={<Clock3 className="size-5" aria-hidden="true" />}
          title="Ready to scan"
          description="Automatic scanning is off. Scan this page to discover accessible stories and highlights."
          action={
            <Button size="sm" onClick={() => void scan.scan()}>
              Scan this page
            </Button>
          }
        />
      );
    }

    if (stories.length === 0 && highlights.length === 0) {
      const pageType = scan.result?.pageType;
      const description =
        pageType === 'story' || pageType === 'highlight'
          ? 'No accessible media was found. The story or highlight may have expired, been deleted, or require access MediaVault does not bypass.'
          : pageType === 'profile'
            ? 'No highlight tray was discovered. Open a highlight or story page to load its media.'
            : 'Open a story, highlight, or profile page to discover accessible stories and highlights.';

      return (
        <div className="space-y-3">
          <LimitationNotice limitations={limitations} />
          <EmptyState
            icon={<Clock3 className="size-5" aria-hidden="true" />}
            title="Nothing accessible here"
            description={description}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void scan.scan()}
                icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
              >
                Scan again
              </Button>
            }
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <LimitationNotice limitations={limitations} />

        {stories.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-fg">Stories</h2>
              <p className="mt-0.5 text-xs text-muted">
                Currently visible stories. Expiration is shown when the platform exposes a
                timestamp.
              </p>
            </div>

            {groups.map((group) => {
              const available = group.stories.filter((story) => story.available);
              return (
                <div
                  key={group.key}
                  className="rounded-lg border border-border bg-surface/60 p-3"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-fg">
                        {group.account?.displayName ?? group.key}
                      </p>
                      <p className="text-[11px] text-muted">
                        @{group.key.replace(/^@/, '')} · {available.length} available
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={available.length === 0}
                      loading={busyKey === `group:${group.key}`}
                      onClick={() => downloadStoryGroup(group)}
                    >
                      Save all from account
                    </Button>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {group.stories.map((story) => (
                      <StoryCard
                        key={story.id}
                        story={story}
                        busy={busyKey === story.id}
                        onDownload={downloadStory}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {highlights.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-fg">Highlights</h2>
              <p className="mt-0.5 text-xs text-muted">
                Highlight media is saved under its title. Covers are saved separately when
                exposed.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {highlights.map((highlight) => (
                <HighlightCard
                  key={highlight.id}
                  highlight={highlight}
                  itemsBusy={busyKey === `highlight:${highlight.id}`}
                  coverBusy={busyKey === `cover:${highlight.id}`}
                  onDownloadItems={downloadHighlight}
                  onDownloadCover={downloadHighlightCover}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  })();

  return (
    <PageShell
      active="stories"
      title="Stories & highlights"
      description="Save stories and highlights already visible in your authorized session. Organization by highlight title is automatic."
      actions={actions}
    >
      <Card className="border-accent/20 bg-accent/5 p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-fg">
              Authorized access only
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              MediaVault reads only stories and highlights already visible in your current
              session. It does not hide view activity, provide anonymous story viewing, or
              bypass private-account or platform privacy controls. If anonymous viewing is not
              available through the platform, it is unavailable here too. Expired, deleted, or
              restricted media cannot be recovered.
            </p>
          </div>
        </div>
      </Card>

      {platform === 'tiktok' && (
        <Card className="border-warning/25 bg-warning/5 p-3">
          <p className="text-[11px] leading-relaxed text-warning">
            TikTok does not expose a supported highlights surface in its public page data.
            Highlight discovery and saving are unavailable on TikTok; visible TikTok stories
            can still be saved when they expose a direct media file.
          </p>
        </Card>
      )}

      {content}
    </PageShell>
  );
}
