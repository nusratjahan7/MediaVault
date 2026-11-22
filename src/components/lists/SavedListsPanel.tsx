import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileJson,
  ListPlus,
  Play,
  ShieldCheck,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { PLATFORM_IDS, PLATFORM_META } from '@/constants';
import { useToast } from '@/hooks/useToast';
import {
  addSavedProfile,
  advanceProfileWorkflow,
  buildSavedListsExport,
  createSavedList,
  deleteSavedList,
  getProfileWorkflow,
  getSavedLists,
  importSavedLists,
  parseImportedSavedLists,
  removeSavedProfile,
  renameSavedList,
  startProfileWorkflow,
  stopProfileWorkflow,
  subscribeToSavedLists,
} from '@/storage/lists';
import type {
  ProfileWorkflow,
  SavedList,
  SavedProfile,
} from '@/types/lists';
import type { PlatformId } from '@/types/platform';
import { getErrorMessage } from '@/utils/errors';
import { readFileText } from '@/utils/file';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PlatformBadge } from '../media/PlatformBadge';
import { SavedListCard } from './SavedListCard';

type NameDialog =
  | { mode: 'create' }
  | { mode: 'rename'; list: SavedList }
  | null;

interface ProfileForm {
  username: string;
  profileUrl: string;
  displayName: string;
}

const EMPTY_PROFILE_FORM: ProfileForm = {
  username: '',
  profileUrl: '',
  displayName: '',
};

export function SavedListsPanel() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lists, setLists] = useState<SavedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [nameDialog, setNameDialog] = useState<NameDialog>(null);
  const [listName, setListName] = useState('');
  const [listPlatform, setListPlatform] = useState<PlatformId>('instagram');
  const [deleteTarget, setDeleteTarget] = useState<SavedList | null>(null);
  const [profileTarget, setProfileTarget] = useState<SavedList | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(EMPTY_PROFILE_FORM);
  const [exportOpen, setExportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<SavedList[] | null>(null);
  const [workflow, setWorkflow] = useState<ProfileWorkflow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([getSavedLists(), getProfileWorkflow()]).then(
      ([nextLists, nextWorkflow]) => {
        if (active) {
          setLists(nextLists);
          setWorkflow(nextWorkflow);
          setLoading(false);
        }
      },
    );

    const unsubscribe = subscribeToSavedLists((next) => {
      if (active) {
        setLists(next);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const valid = new Set(
      lists.flatMap((list) => list.accounts.map((profile) => `${list.id}:${profile.id}`)),
    );

    setSelectedKeys((previous) => {
      const next = new Set([...previous].filter((key) => valid.has(key)));
      return next.size === previous.size ? previous : next;
    });
  }, [lists]);

  const selectedProfiles = useMemo<SavedProfile[]>(
    () =>
      lists.flatMap((list) =>
        list.accounts.filter((profile) =>
          selectedKeys.has(`${list.id}:${profile.id}`),
        ),
      ),
    [lists, selectedKeys],
  );

  const totalProfiles = lists.reduce((count, list) => count + list.accounts.length, 0);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
    } catch (caught) {
      toast({
        title: 'Action failed',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const openNameDialog = (dialog: NameDialog) => {
    setNameDialog(dialog);
    setListName(dialog?.mode === 'rename' ? dialog.list.name : '');
    setListPlatform(dialog?.mode === 'rename' ? dialog.list.platform : 'instagram');
  };

  const submitName = async () => {
    if (!nameDialog) {
      return;
    }

    await run('name', async () => {
      if (nameDialog.mode === 'create') {
        await createSavedList(listName, listPlatform);
        toast({ title: 'List created', description: listName.trim(), variant: 'success' });
      } else {
        const next = await renameSavedList(nameDialog.list.id, listName);
        setLists(next);
        toast({ title: 'List renamed', variant: 'success' });
      }

      setLists(await getSavedLists());
      setNameDialog(null);
      setListName('');
    });
  };

  const submitProfile = async () => {
    if (!profileTarget) {
      return;
    }

    await run('profile', async () => {
      const next = await addSavedProfile(profileTarget.id, {
        username: profileForm.username,
        ...(profileForm.profileUrl.trim()
          ? { profileUrl: profileForm.profileUrl.trim() }
          : {}),
        ...(profileForm.displayName.trim()
          ? { displayName: profileForm.displayName.trim() }
          : {}),
      });
      setLists(next);
      setProfileTarget(null);
      setProfileForm(EMPTY_PROFILE_FORM);
      toast({ title: 'Profile saved', variant: 'success' });
    });
  };

  const removeProfile = async (listId: string, profileId: string) => {
    await run(`remove-${profileId}`, async () => {
      const next = await removeSavedProfile(listId, profileId);
      setLists(next);
      setSelectedKeys((previous) => {
        const nextKeys = new Set(previous);
        nextKeys.delete(`${listId}:${profileId}`);
        return nextKeys;
      });
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    await run('delete', async () => {
      const next = await deleteSavedList(deleteTarget.id);
      setLists(next);
      setDeleteTarget(null);
      toast({ title: 'List deleted', variant: 'success' });
    });
  };

  const toggleProfile = (listId: string, profileId: string) => {
    const key = `${listId}:${profileId}`;
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const openProfile = async (profile: SavedProfile) => {
    try {
      await chrome.tabs.create({ url: profile.profileUrl });
    } catch (caught) {
      toast({
        title: 'Could not open profile',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    }
  };

  const startWorkflow = async () => {
    await run('workflow', async () => {
      const next = await startProfileWorkflow(selectedProfiles);
      setWorkflow(next);
      const first = next.profiles[next.index];
      if (first) {
        await openProfile(first);
      }
      toast({
        title: 'Profile workflow started',
        description:
          'Each profile opens in a tab. Use the popup to scan and download visible media there.',
        variant: 'success',
      });
    });
  };

  const nextWorkflowProfile = async () => {
    if (!workflow) {
      return;
    }

    setBusy('workflow-next');
    try {
      const next = await advanceProfileWorkflow(workflow);

      if (!next) {
        await stopProfileWorkflow();
        setWorkflow(null);
        toast({ title: 'Profile workflow complete', variant: 'success' });
        return;
      }

      setWorkflow(next);
      const profile = next.profiles[next.index];
      if (profile) {
        await openProfile(profile);
      }
    } catch (caught) {
      toast({
        title: 'Could not advance workflow',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  const stopWorkflow = async () => {
    await stopProfileWorkflow();
    setWorkflow(null);
    toast({ title: 'Profile workflow stopped', variant: 'success' });
  };

  const confirmExport = () => {
    const payload = buildSavedListsExport(lists);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mediavault-saved-lists-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setExportOpen(false);
    toast({
      title: 'Saved lists exported',
      description: `${lists.length} lists, ${totalProfiles} profiles.`,
      variant: 'success',
    });
  };

  const chooseImportFile = async (file: File) => {
    try {
      const parsed = parseImportedSavedLists(await readFileText(file));
      setPendingImport(parsed);
    } catch (caught) {
      toast({
        title: 'Import rejected',
        description: getErrorMessage(caught),
        variant: 'error',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) {
      return;
    }

    await run('import', async () => {
      const next = await importSavedLists(pendingImport);
      setLists(next);
      setPendingImport(null);
      toast({
        title: 'Lists imported',
        description: `${pendingImport.length} lists added locally.`,
        variant: 'success',
      });
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-accent/20 bg-accent/5 p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-fg">Saved lists are local-only</p>
            <p className="mt-0.5 max-w-[80ch] text-[11px] leading-relaxed text-muted">
              Lists store only usernames, profile URLs, and optional display names. MediaVault
              never stores passwords, cookies, tokens, or private messages. Imports are
              validated before anything is saved.
            </p>
          </div>
        </div>
      </Card>

      {workflow && (
        <Card className="border-accent/25 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">
                  Profile {workflow.index + 1} of {workflow.profiles.length}
                </Badge>
                <PlatformBadge
                  platform={workflow.profiles[workflow.index]?.platform ?? 'instagram'}
                />
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-fg">
                {workflow.profiles[workflow.index]?.displayName ??
                  workflow.profiles[workflow.index]?.username}
              </p>
              <p className="truncate text-[11px] text-muted">
                {workflow.profiles[workflow.index]?.profileUrl}
              </p>
              <p className="mt-1 max-w-[70ch] text-[10px] leading-relaxed text-muted">
                MediaVault opens each profile for you. It does not crawl profiles or download
                automatically; use the popup on the opened page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const profile = workflow.profiles[workflow.index];
                  if (profile) {
                    void openProfile(profile);
                  }
                }}
              >
                Open profile
              </Button>
              <Button
                size="sm"
                loading={busy === 'workflow-next'}
                onClick={() => void nextWorkflowProfile()}
                icon={<Play className="size-3.5" aria-hidden="true" />}
              >
                Next profile
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void stopWorkflow()}>
                Stop
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-fg">Saved lists</h2>
          <p className="mt-0.5 text-xs text-muted">
            {lists.length} lists · {totalProfiles} profiles · {selectedProfiles.length} selected
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openNameDialog({ mode: 'create' })}
            icon={<ListPlus className="size-3.5" aria-hidden="true" />}
          >
            New list
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={lists.length === 0}
            onClick={() => setExportOpen(true)}
            icon={<Download className="size-3.5" aria-hidden="true" />}
          >
            Export JSON
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            icon={<Upload className="size-3.5" aria-hidden="true" />}
          >
            Import JSON
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void chooseImportFile(file);
              }
            }}
          />
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={selectedProfiles.length === 0}
              loading={busy === 'workflow'}
              onClick={() => void startWorkflow()}
              icon={<Play className="size-3.5" aria-hidden="true" />}
            >
              Start workflow ({selectedProfiles.length})
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={selectedProfiles.length === 0}
              onClick={() => setSelectedKeys(new Set())}
              icon={<X className="size-3.5" aria-hidden="true" />}
            >
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <Users className="size-3.5" aria-hidden="true" />
            Select profiles across lists to open them in sequence.
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-2">
            <FileJson className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
            <div>
              <p className="text-xs font-medium text-fg">Account relationship export</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Export only follower/following rows you can already access, or import an
                official platform data export.
              </p>
            </div>
          </div>
          <a
            href="relationships.html"
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-elevated px-2.5 text-xs font-medium text-fg transition-colors hover:bg-surface"
          >
            Open export
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </div>
      </Card>

      {loading ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-center text-xs text-muted">
          Loading saved lists…
        </div>
      ) : lists.length === 0 ? (
        <EmptyState
          icon={<ListPlus className="size-5" aria-hidden="true" />}
          title="No saved lists yet"
          description="Create a list, then add profiles by username or profile URL. You can export or import lists as JSON at any time."
          action={
            <Button size="sm" onClick={() => openNameDialog({ mode: 'create' })}>
              Create your first list
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lists.map((list) => (
            <SavedListCard
              key={list.id}
              list={list}
              selectedKeys={selectedKeys}
              onToggleProfile={toggleProfile}
              onAddProfile={setProfileTarget}
              onRemoveProfile={(listId, profileId) => {
                void removeProfile(listId, profileId);
              }}
              onRename={(target) => openNameDialog({ mode: 'rename', list: target })}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <Modal
        open={nameDialog !== null}
        onClose={() => setNameDialog(null)}
        title={nameDialog?.mode === 'create' ? 'Create saved list' : 'Rename saved list'}
        description={
          nameDialog?.mode === 'create'
            ? 'Lists are stored locally in this browser profile.'
            : 'The list platform cannot be changed after creation.'
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setNameDialog(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={busy === 'name'}
              disabled={!listName.trim()}
              onClick={() => void submitName()}
            >
              {nameDialog?.mode === 'create' ? 'Create list' : 'Rename'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="saved-list-name" className="text-xs font-medium text-fg">
              List name
            </label>
            <Input
              id="saved-list-name"
              value={listName}
              onChange={(event) => setListName(event.target.value)}
              placeholder="Fashion Inspiration"
              maxLength={80}
              autoFocus
            />
          </div>
          {nameDialog?.mode === 'create' && (
            <div className="space-y-1.5">
              <label htmlFor="saved-list-platform" className="text-xs font-medium text-fg">
                Platform
              </label>
              <select
                id="saved-list-platform"
                value={listPlatform}
                onChange={(event) => setListPlatform(event.target.value as PlatformId)}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg"
              >
                {PLATFORM_IDS.map((platform) => (
                  <option key={platform} value={platform}>
                    {PLATFORM_META[platform].label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={profileTarget !== null}
        onClose={() => {
          setProfileTarget(null);
          setProfileForm(EMPTY_PROFILE_FORM);
        }}
        title={`Add profile${profileTarget ? ` to ${profileTarget.name}` : ''}`}
        description="Only username and profile URL are stored. Do not paste passwords, cookies, or tokens."
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setProfileTarget(null);
                setProfileForm(EMPTY_PROFILE_FORM);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={busy === 'profile'}
              disabled={!profileForm.username.trim()}
              onClick={() => void submitProfile()}
            >
              Save profile
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {profileTarget && (
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <PlatformBadge platform={profileTarget.platform} />
              URL must match this platform.
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="saved-profile-username" className="text-xs font-medium text-fg">
              Username
            </label>
            <Input
              id="saved-profile-username"
              value={profileForm.username}
              onChange={(event) =>
                setProfileForm((previous) => ({
                  ...previous,
                  username: event.target.value,
                }))
              }
              placeholder="example"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="saved-profile-url" className="text-xs font-medium text-fg">
              Profile URL (optional)
            </label>
            <Input
              id="saved-profile-url"
              value={profileForm.profileUrl}
              onChange={(event) =>
                setProfileForm((previous) => ({
                  ...previous,
                  profileUrl: event.target.value,
                }))
              }
              placeholder="https://www.instagram.com/example/"
              spellCheck={false}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="saved-profile-name" className="text-xs font-medium text-fg">
              Display name (optional)
            </label>
            <Input
              id="saved-profile-name"
              value={profileForm.displayName}
              onChange={(event) =>
                setProfileForm((previous) => ({
                  ...previous,
                  displayName: event.target.value,
                }))
              }
              placeholder="Example Studio"
              maxLength={80}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete saved list?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” and its ${deleteTarget.accounts.length} profiles will be removed from this device.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy === 'delete'}
              onClick={() => void confirmDelete()}
            >
              Delete list
            </Button>
          </>
        }
      />

      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export saved lists?"
        description="The JSON file is generated locally and contains only list names, platforms, usernames, profile URLs, and optional display names."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmExport}>
              Download JSON
            </Button>
          </>
        }
      >
        <p className="text-[11px] text-muted">
          {lists.length} {lists.length === 1 ? 'list' : 'lists'} · {totalProfiles} profiles
        </p>
      </Modal>

      <Modal
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title="Import saved lists?"
        description="Validated lists will be added to your existing lists. No passwords, cookies, or tokens are imported."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={busy === 'import'}
              onClick={() => void confirmImport()}
            >
              Import lists
            </Button>
          </>
        }
      >
        {pendingImport && (
          <div className="space-y-1.5">
            {pendingImport.slice(0, 6).map((list) => (
              <div key={list.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate font-medium text-fg">{list.name}</span>
                <span className="shrink-0 text-muted">
                  {PLATFORM_META[list.platform].label} · {list.accounts.length} profiles
                </span>
              </div>
            ))}
            {pendingImport.length > 6 && (
              <p className="text-[10px] text-muted">
                +{pendingImport.length - 6} more lists
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
