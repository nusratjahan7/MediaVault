import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileJson,
  Filter,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  Upload,
  Users,
} from 'lucide-react';
import { getAdapterForUrl } from '@/adapters/registry';
import { PageShell } from '@/components/layout/PageShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { PLATFORM_IDS, PLATFORM_META } from '@/constants';
import { useScan } from '@/hooks/useScan';
import { useSettings } from '@/hooks/useSettings';
import { useSiteAccess } from '@/hooks/useSiteAccess';
import { useTargetTab } from '@/hooks/useTargetTab';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import { parseRelationshipImport } from '@/services/relationship-import';
import type { PlatformId } from '@/types/platform';
import type {
  RelationshipEntry,
  RelationshipKind,
} from '@/types/relationship';
import {
  RELATIONSHIP_FIELDS,
  filterRelationships,
  relationshipsToCsv,
  relationshipsToJson,
  type RelationshipField,
} from '@/utils/relationship-export';
import { getErrorMessage } from '@/utils/errors';
import { readFileText } from '@/utils/file';

type SourceMode = 'page' | 'import';
type ExportFormat = 'csv' | 'json';

interface ImportedDataset {
  platform: PlatformId;
  kind: RelationshipKind;
  entries: RelationshipEntry[];
  fileName: string;
}

const OFFICIAL_EXPORT_LINKS: Record<
  PlatformId,
  { label: string; href: string; note: string }
> = {
  instagram: {
    label: 'Instagram Accounts Center',
    href: 'https://accountscenter.instagram.com/info_and_permissions/dyi/',
    note: 'Download your information, then import the followers/following JSON or CSV here.',
  },
  facebook: {
    label: 'Facebook Download Your Information',
    href: 'https://www.facebook.com/dyi/',
    note: 'Request your data, select followers/following where available, then import the file.',
  },
  tiktok: {
    label: 'TikTok Download your data',
    href: 'https://www.tiktok.com/setting/download-your-data',
    note: 'Request your data, then import the follower/following file locally.',
  },
};

export function App() {
  const { settings } = useSettings();
  const { resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const {
    tab,
    url,
    loading: tabLoading,
    error: tabError,
    refresh: refreshTab,
  } = useTargetTab();

  const adapter = useMemo(() => (url ? getAdapterForUrl(url) : undefined), [url]);
  const platform = adapter?.id ?? null;
  const siteAccess = useSiteAccess(platform, tab?.id);
  const scan = useScan(
    tab?.id ?? null,
    siteAccess.status?.enabled ?? false,
    settings.autoScan,
  );

  const [source, setSource] = useState<SourceMode>('page');
  const [imported, setImported] = useState<ImportedDataset | null>(null);
  const [importPlatform, setImportPlatform] = useState<PlatformId>('instagram');
  const [importKind, setImportKind] = useState<RelationshipKind>('followers');
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState('');
  const [fields, setFields] = useState<Set<RelationshipField>>(
    () => new Set(['username', 'profileUrl']),
  );
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [exportOpen, setExportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adapter) {
      setImportPlatform(adapter.id);
    }
  }, [adapter]);

  const pageKind = scan.result?.relationshipKind;
  const pageEntries = scan.result?.relationships ?? [];
  const pageDataset =
    source === 'page' && platform && pageKind
      ? {
          platform,
          kind: pageKind,
          entries: pageEntries,
        }
      : null;
  const dataset =
    source === 'import'
      ? imported
      : pageDataset;

  const filtered = useMemo(
    () => (dataset ? filterRelationships(dataset.entries, query) : []),
    [dataset, query],
  );

  const toggleField = (field: RelationshipField) => {
    setFields((previous) => {
      const next = new Set(previous);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const enableSite = async () => {
    const result = await siteAccess.enable();
    if (!result.ok) {
      toast({
        title: 'Site access not granted',
        description: result.error ?? 'MediaVault could not read this page.',
        variant: 'error',
      });
      return;
    }
    await siteAccess.refresh();
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const entries = parseRelationshipImport(await readFileText(file), {
        platform: importPlatform,
        kind: importKind,
        fileName: file.name,
      });
      setImported({
        platform: importPlatform,
        kind: importKind,
        entries,
        fileName: file.name,
      });
      setSource('import');
      setQuery('');
      toast({
        title: 'Official export loaded',
        description: `${entries.length} ${importKind} rows parsed locally.`,
        variant: 'success',
      });
    } catch (caught) {
      toast({
        title: 'Import rejected',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const confirmExport = () => {
    if (!dataset) {
      return;
    }

    const selectedFields = RELATIONSHIP_FIELDS.map((field) => field.id).filter(
      (field) => fields.has(field),
    );
    const content =
      format === 'csv'
        ? relationshipsToCsv(filtered, selectedFields)
        : relationshipsToJson(filtered, selectedFields);
    const blob = new Blob([content], {
      type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `mediavault-${dataset.platform}-${dataset.kind}.${format}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    setExportOpen(false);
    toast({
      title: `Exported ${filtered.length} rows`,
      description: 'The file was generated locally. Nothing was uploaded.',
      variant: 'success',
    });
  };

  const pageSource = (() => {
    if (tabLoading) {
      return <Skeleton className="h-36 w-full" />;
    }

    if (tabError) {
      return <ErrorState description={tabError} onRetry={() => void refreshTab()} />;
    }

    if (!url || !platform) {
      return (
        <Card className="p-4 text-[11px] leading-relaxed text-muted">
          Open an Instagram, Facebook, or TikTok followers/following page in a tab, or use
          <span className="font-medium text-fg"> Official export file</span> below. MediaVault
          does not crawl profiles in the background.
        </Card>
      );
    }

    if (siteAccess.loading && !siteAccess.status) {
      return <Skeleton className="h-28 w-full" />;
    }

    if (!siteAccess.status?.enabled) {
      return (
        <Card className="p-4">
          <p className="text-xs font-semibold text-fg">Enable site access</p>
          <p className="mt-1 max-w-[65ch] text-[11px] leading-relaxed text-muted">
            Chrome needs one-time permission to read rows already rendered on this page.
          </p>
          <Button
            size="sm"
            className="mt-3"
            loading={siteAccess.busy}
            onClick={() => void enableSite()}
          >
            Enable on this site
          </Button>
        </Card>
      );
    }

    if (scan.state === 'scanning') {
      return <Skeleton className="h-36 w-full" />;
    }

    if (scan.state === 'error') {
      return (
        <ErrorState
          title="Could not read this page"
          description={scan.error ?? 'Reload the page and try again.'}
          onRetry={() => void scan.scan()}
        />
      );
    }

    if (scan.state === 'idle') {
      return (
        <Card className="p-4">
          <p className="text-xs font-semibold text-fg">Ready to read visible rows</p>
          <p className="mt-1 text-[11px] text-muted">
            Automatic scanning is off. MediaVault will only read rows already loaded in the
            page.
          </p>
          <Button size="sm" className="mt-3" onClick={() => void scan.scan()}>
            Scan visible page
          </Button>
        </Card>
      );
    }

    if (!pageKind) {
      return (
        <Card className="p-4">
          <p className="text-xs font-semibold text-fg">Not a followers/following page</p>
          <p className="mt-1 max-w-[65ch] text-[11px] leading-relaxed text-muted">
            This page did not expose a followers or following list. Open that list on the
            platform, then rescan. Only rows currently rendered are readable.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void scan.scan()}
            icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
          >
            Rescan page
          </Button>
        </Card>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">
            {pageKind === 'followers' ? 'Followers' : 'Following'} · visible page
          </Badge>
          <Badge tone="neutral">{pageEntries.length} rows</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void scan.scan()}
            icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
          >
            Rescan
          </Button>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          Only rows currently loaded in the page are included. Scroll the platform list to load
          more, then rescan. No automatic scrolling or API access is used.
        </p>
      </div>
    );
  })();

  return (
    <PageShell
      active="relationships"
      title="Relationship export"
      description="Export follower/following rows you can already access, or import your official platform data export. Everything is processed locally."
      actions={
        <>
          <IconButton
            label="Refresh visible page"
            onClick={() => void refreshTab()}
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
      }
    >
      <Card className="border-accent/20 bg-accent/5 p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-fg">Authorized data only</p>
            <p className="mt-0.5 max-w-[85ch] text-[11px] leading-relaxed text-muted">
              MediaVault reads only rows already visible in your current session or a file you
              choose. It does not use cookies, tokens, private APIs, automatic scrolling, or
              scraping bypasses. Exports stay on this device; nothing is uploaded.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={source === 'page' ? 'primary' : 'secondary'}
          onClick={() => setSource('page')}
          icon={<Users className="size-3.5" aria-hidden="true" />}
        >
          Visible page
        </Button>
        <Button
          size="sm"
          variant={source === 'import' ? 'primary' : 'secondary'}
          onClick={() => setSource('import')}
          icon={<Upload className="size-3.5" aria-hidden="true" />}
        >
          Official export file
        </Button>
        {imported && (
          <Badge tone="neutral">
            {imported.fileName} · {imported.entries.length} rows
          </Badge>
        )}
      </div>

      {source === 'page' ? (
        pageSource
      ) : (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Upload className="size-4 text-muted" aria-hidden="true" />
            <p className="text-xs font-semibold text-fg">Import an official data export</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="relationship-platform" className="text-[11px] font-medium text-fg">
                Platform
              </label>
              <select
                id="relationship-platform"
                value={importPlatform}
                onChange={(event) => setImportPlatform(event.target.value as PlatformId)}
                className="h-9 w-full rounded-md border border-border bg-surface px-2 text-xs text-fg"
              >
                {PLATFORM_IDS.map((entry) => (
                  <option key={entry} value={entry}>
                    {PLATFORM_META[entry].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="relationship-kind" className="text-[11px] font-medium text-fg">
                List
              </label>
              <select
                id="relationship-kind"
                value={importKind}
                onChange={(event) => setImportKind(event.target.value as RelationshipKind)}
                className="h-9 w-full rounded-md border border-border bg-surface px-2 text-xs text-fg"
              >
                <option value="followers">Followers</option>
                <option value="following">Following</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                block
                size="sm"
                loading={importing}
                onClick={() => fileInputRef.current?.click()}
                icon={<FileJson className="size-3.5" aria-hidden="true" />}
              >
                Choose JSON or CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json,text/csv,.csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleImport(file);
                  }
                }}
              />
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-muted">
            Supported: official JSON exports with follower/following records, or CSV with
            username/profile URL headers. Unknown and private fields are ignored.
          </p>
          {imported && (
            <div className="rounded-md border border-border bg-bg px-3 py-2 text-[11px] text-muted">
              Loaded {imported.entries.length} {imported.kind} rows from{' '}
              {PLATFORM_META[imported.platform].label}. Select “Use imported file” content below
              by staying on this source.
            </div>
          )}
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="size-3.5 text-muted" aria-hidden="true" />
          <p className="text-xs font-semibold text-fg">Filter and choose fields</p>
          {dataset && (
            <Badge tone="neutral">
              {dataset.platform} · {dataset.kind} · {filtered.length} of{' '}
              {dataset.entries.length} rows
            </Badge>
          )}
        </div>

        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter username, profile URL, or display name"
          aria-label="Filter relationship rows"
        />

        <div className="flex flex-wrap gap-3">
          {RELATIONSHIP_FIELDS.map((field) => (
            <label
              key={field.id}
              className="inline-flex items-center gap-1.5 text-[11px] text-fg"
            >
              <input
                type="checkbox"
                checked={fields.has(field.id)}
                onChange={() => toggleField(field.id)}
                className="size-3.5 accent-[var(--color-accent)]"
              />
              {field.label}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="relationship-format" className="text-[11px] text-muted">
              Format
            </label>
            <select
              id="relationship-format"
              value={format}
              onChange={(event) => setFormat(event.target.value as ExportFormat)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-fg"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <Button
            size="sm"
            disabled={!dataset || filtered.length === 0 || fields.size === 0}
            onClick={() => setExportOpen(true)}
            icon={<Download className="size-3.5" aria-hidden="true" />}
          >
            Export {filtered.length} rows
          </Button>
        </div>
      </Card>

      {!dataset ? (
        <EmptyState
          icon={<Users className="size-5" aria-hidden="true" />}
          title="No relationship data yet"
          description="Open a followers/following page and scan, or import your official platform data export. MediaVault will not fetch private or restricted lists."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Filter className="size-5" aria-hidden="true" />}
          title="No rows match"
          description="Change the filter or load a different source."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[11px] font-semibold text-fg">Preview</p>
          </div>
          <div className="max-h-64 divide-y divide-border overflow-auto">
            {filtered.slice(0, 100).map((entry) => (
              <div
                key={entry.profileUrl ?? entry.username}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-fg">
                    {entry.displayName ?? entry.username}
                  </p>
                  <p className="truncate text-[10px] text-muted">@{entry.username}</p>
                </div>
                {entry.profileUrl && (
                  <a
                    href={entry.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted hover:text-fg"
                  >
                    Profile
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            ))}
          </div>
          {filtered.length > 100 && (
            <p className="border-t border-border px-3 py-2 text-[10px] text-muted">
              Previewing the first 100 rows. Export includes all {filtered.length} filtered
              rows.
            </p>
          )}
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <p className="text-xs font-semibold text-fg">Official privacy and data exports</p>
        <p className="text-[11px] leading-relaxed text-muted">
          Use the platform's official settings. MediaVault does not bypass privacy controls or
          claim anonymous access.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {PLATFORM_IDS.map((entry) => (
            <a
              key={entry}
              href={OFFICIAL_EXPORT_LINKS[entry].href}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-border bg-bg p-2.5 transition-colors hover:bg-elevated"
            >
              <p className="flex items-center gap-1 text-[11px] font-medium text-fg">
                {OFFICIAL_EXPORT_LINKS[entry].label}
                <ExternalLink className="size-3" aria-hidden="true" />
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                {OFFICIAL_EXPORT_LINKS[entry].note}
              </p>
            </a>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-semibold text-fg">Platform limitations</p>
        <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted">
          <li>• Only currently rendered page rows are read; no automatic scrolling or crawling.</li>
          <li>• Private, hidden, or restricted relationships are not accessed.</li>
          <li>• Official export formats vary; unsupported files are rejected with a clear message.</li>
          <li>• Filtering and field selection affect both JSON and CSV exports.</li>
          <li>• Export files are generated locally and never uploaded to a server.</li>
        </ul>
      </Card>

      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export relationship data?"
        description={
          dataset
            ? `${filtered.length} ${dataset.kind} rows will be saved as ${format.toUpperCase()} on this device.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmExport}>
              Download {format.toUpperCase()}
            </Button>
          </>
        }
      >
        <div className="space-y-1 text-[11px] text-muted">
          <p>Fields: {[...fields].join(', ') || 'none'}</p>
          <p>Rows: {filtered.length}</p>
          <p>No data leaves this device.</p>
        </div>
      </Modal>
    </PageShell>
  );
}
