import {
  MAX_PROFILE_WORKFLOW_ITEMS,
  MAX_SAVED_LISTS,
  MAX_SAVED_PROFILES_PER_LIST,
  PLATFORM_IDS,
  PROFILE_WORKFLOW_SESSION_KEY,
  SAVED_LISTS_STORAGE_KEY,
} from '@/constants';
import type {
  ProfileWorkflow,
  SavedList,
  SavedListsExport,
  SavedProfile,
} from '@/types/lists';
import type { PlatformId } from '@/types/platform';
import { AppError } from '@/utils/errors';
import { createId } from '@/utils/id';
import {
  defaultProfileUrl,
  normalizeProfileUsername,
  parseProfileUrlForPlatform,
  PROFILE_USERNAME_PATTERN,
} from '@/utils/profile';

interface ListsEnvelope {
  version: 1;
  lists: SavedList[];
}

interface WorkflowEnvelope {
  version: 1;
  workflow: ProfileWorkflow;
}

const VALID_PLATFORMS = new Set<PlatformId>(PLATFORM_IDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlatform(value: unknown): value is PlatformId {
  return typeof value === 'string' && VALID_PLATFORMS.has(value as PlatformId);
}

function parseProfile(
  value: unknown,
  platform: PlatformId,
  strict: boolean,
  path: string,
): SavedProfile | null {
  if (!isRecord(value)) {
    if (strict) {
      throw new AppError('INVALID_INPUT', `${path} must be an object.`);
    }
    return null;
  }

  const username =
    typeof value.username === 'string'
      ? normalizeProfileUsername(value.username)
      : '';
  if (!PROFILE_USERNAME_PATTERN.test(username)) {
    if (strict) {
      throw new AppError('INVALID_INPUT', `${path}.username is invalid.`);
    }
    return null;
  }

  let profileUrl = defaultProfileUrl(platform, username);

  if (value.profileUrl !== undefined && value.profileUrl !== '') {
    if (typeof value.profileUrl !== 'string') {
      if (strict) {
        throw new AppError('INVALID_INPUT', `${path}.profileUrl must be a URL.`);
      }
      return null;
    }

    const parsed = parseProfileUrlForPlatform(platform, value.profileUrl);
    if (!parsed) {
      if (strict) {
        throw new AppError(
          'INVALID_INPUT',
          `${path}.profileUrl must be an ${platform} profile URL.`,
        );
      }
      return null;
    }
    profileUrl = parsed;
  }

  const displayName =
    typeof value.displayName === 'string' && value.displayName.trim()
      ? value.displayName.trim().slice(0, 80)
      : undefined;

  return {
    id:
      !strict && typeof value.id === 'string' && value.id.trim()
        ? value.id
        : createId('profile'),
    platform,
    username,
    profileUrl,
    ...(displayName ? { displayName } : {}),
    addedAt:
      !strict && typeof value.addedAt === 'number' && Number.isFinite(value.addedAt)
        ? value.addedAt
        : Date.now(),
  };
}

export function parseSavedList(
  value: unknown,
  options: { strict?: boolean; path?: string } = {},
): SavedList | null {
  const strict = options.strict ?? false;
  const path = options.path ?? 'list';

  if (!isRecord(value)) {
    if (strict) {
      throw new AppError('INVALID_INPUT', `${path} must be an object.`);
    }
    return null;
  }

  const name = typeof value.name === 'string' ? value.name.trim().slice(0, 80) : '';
  if (!name) {
    if (strict) {
      throw new AppError('INVALID_INPUT', `${path}.name is required.`);
    }
    return null;
  }

  if (!isPlatform(value.platform)) {
    if (strict) {
      throw new AppError('INVALID_INPUT', `${path}.platform is not supported.`);
    }
    return null;
  }

  if (!Array.isArray(value.accounts)) {
    if (strict) {
      throw new AppError('INVALID_INPUT', `${path}.accounts must be an array.`);
    }
    return null;
  }

  if (strict && value.accounts.length > MAX_SAVED_PROFILES_PER_LIST) {
    throw new AppError(
      'INVALID_INPUT',
      `${path}.accounts supports at most ${MAX_SAVED_PROFILES_PER_LIST} profiles.`,
    );
  }

  const profiles: SavedProfile[] = [];
  const seen = new Set<string>();

  for (const [index, account] of value.accounts
    .slice(0, MAX_SAVED_PROFILES_PER_LIST)
    .entries()) {
    const profile = parseProfile(
      account,
      value.platform,
      strict,
      `${path}.accounts[${index}]`,
    );

    if (!profile) {
      continue;
    }

    const key = profile.username.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    profiles.push(profile);
  }

  const now = Date.now();

  return {
    id:
      !strict && typeof value.id === 'string' && value.id.trim()
        ? value.id
        : createId('list'),
    name,
    platform: value.platform,
    accounts: profiles,
    createdAt:
      !strict && typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt
        : now,
    updatedAt:
      !strict && typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : now,
  };
}

function parseStoredLists(value: unknown): SavedList[] {
  const candidate = isRecord(value) && Array.isArray(value.lists) ? value.lists : value;

  if (!Array.isArray(candidate)) {
    return [];
  }

  const lists: SavedList[] = [];
  for (const [index, raw] of candidate.slice(0, MAX_SAVED_LISTS).entries()) {
    const list = parseSavedList(raw, { path: `lists[${index}]` });
    if (list) {
      lists.push(list);
    }
  }

  return lists;
}

export function parseImportedSavedLists(value: unknown): SavedList[] {
  let parsed = value;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new AppError('INVALID_INPUT', 'The selected file is not valid JSON.');
    }
  }

  const candidate =
    isRecord(parsed) && Array.isArray(parsed.lists)
      ? parsed.lists
      : Array.isArray(parsed)
        ? parsed
        : [parsed];

  if (candidate.length === 0) {
    throw new AppError('INVALID_INPUT', 'The file contains no saved lists.');
  }

  if (candidate.length > MAX_SAVED_LISTS) {
    throw new AppError(
      'INVALID_INPUT',
      `The file contains more than ${MAX_SAVED_LISTS} lists.`,
    );
  }

  const lists: SavedList[] = [];
  const names = new Set<string>();

  for (const [index, raw] of candidate.entries()) {
    const list = parseSavedList(raw, {
      strict: true,
      path: `lists[${index}]`,
    });

    if (!list) {
      throw new AppError('INVALID_INPUT', `lists[${index}] is invalid.`);
    }

    if (names.has(list.name.toLowerCase())) {
      throw new AppError(
        'INVALID_INPUT',
        `The file contains a duplicate list name: ${list.name}.`,
      );
    }

    names.add(list.name.toLowerCase());
    lists.push(list);
  }

  return lists;
}

export async function getSavedLists(): Promise<SavedList[]> {
  try {
    const stored = await chrome.storage.local.get(SAVED_LISTS_STORAGE_KEY);
    return parseStoredLists(stored[SAVED_LISTS_STORAGE_KEY]);
  } catch {
    return [];
  }
}

async function writeSavedLists(lists: SavedList[]): Promise<SavedList[]> {
  const envelope: ListsEnvelope = { version: 1, lists };
  await chrome.storage.local.set({ [SAVED_LISTS_STORAGE_KEY]: envelope });
  return lists;
}

export async function createSavedList(
  name: string,
  platform: PlatformId,
): Promise<SavedList> {
  const existing = await getSavedLists();
  if (existing.length >= MAX_SAVED_LISTS) {
    throw new AppError('INVALID_INPUT', `MediaVault supports at most ${MAX_SAVED_LISTS} lists.`);
  }

  const parsed = parseSavedList(
    { name, platform, accounts: [] },
    { strict: true, path: 'list' },
  );

  if (!parsed) {
    throw new AppError('INVALID_INPUT', 'The list is invalid.');
  }

  await writeSavedLists([...existing, parsed]);
  return parsed;
}

export async function renameSavedList(id: string, name: string): Promise<SavedList[]> {
  const nextName = name.trim().slice(0, 80);
  if (!nextName) {
    throw new AppError('INVALID_INPUT', 'A list name is required.');
  }

  const lists = await getSavedLists();
  const updated = lists.map((list) =>
    list.id === id ? { ...list, name: nextName, updatedAt: Date.now() } : list,
  );
  await writeSavedLists(updated);
  return updated;
}

export async function deleteSavedList(id: string): Promise<SavedList[]> {
  const lists = await getSavedLists();
  const updated = lists.filter((list) => list.id !== id);
  await writeSavedLists(updated);
  return updated;
}

export async function addSavedProfile(
  listId: string,
  input: { username: string; profileUrl?: string; displayName?: string },
): Promise<SavedList[]> {
  const lists = await getSavedLists();
  const list = lists.find((entry) => entry.id === listId);

  if (!list) {
    throw new AppError('INVALID_INPUT', 'That saved list no longer exists.');
  }

  if (list.accounts.length >= MAX_SAVED_PROFILES_PER_LIST) {
    throw new AppError(
      'INVALID_INPUT',
      `This list supports at most ${MAX_SAVED_PROFILES_PER_LIST} profiles.`,
    );
  }

  const profile = parseProfile(input, list.platform, true, 'profile');
  if (!profile) {
    throw new AppError('INVALID_INPUT', 'The profile is invalid.');
  }

  if (
    list.accounts.some(
      (account) =>
        account.username.toLowerCase() === profile.username.toLowerCase() ||
        account.profileUrl === profile.profileUrl,
    )
  ) {
    throw new AppError('INVALID_INPUT', 'That profile is already in this list.');
  }

  const updated = lists.map((entry) =>
    entry.id === listId
      ? {
          ...entry,
          accounts: [...entry.accounts, profile],
          updatedAt: Date.now(),
        }
      : entry,
  );

  await writeSavedLists(updated);
  return updated;
}

export async function removeSavedProfile(
  listId: string,
  profileId: string,
): Promise<SavedList[]> {
  const lists = await getSavedLists();
  const updated = lists.map((list) =>
    list.id === listId
      ? {
          ...list,
          accounts: list.accounts.filter((account) => account.id !== profileId),
          updatedAt: Date.now(),
        }
      : list,
  );
  await writeSavedLists(updated);
  return updated;
}

export async function importSavedLists(lists: SavedList[]): Promise<SavedList[]> {
  const existing = await getSavedLists();
  if (existing.length + lists.length > MAX_SAVED_LISTS) {
    throw new AppError(
      'INVALID_INPUT',
      `Importing would exceed the ${MAX_SAVED_LISTS}-list limit.`,
    );
  }

  return writeSavedLists([...existing, ...lists]);
}

export function buildSavedListsExport(lists: SavedList[]): SavedListsExport {
  return {
    app: 'MediaVault',
    version: 1,
    exportedAt: new Date().toISOString(),
    lists,
  };
}

export async function clearSavedLists(): Promise<void> {
  await chrome.storage.local.remove(SAVED_LISTS_STORAGE_KEY);
}

export function subscribeToSavedLists(listener: (lists: SavedList[]) => void): () => void {
  const handler = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== 'local') {
      return;
    }

    const change = changes[SAVED_LISTS_STORAGE_KEY];
    if (change) {
      listener(parseStoredLists(change.newValue));
    }
  };

  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}

function parseWorkflow(value: unknown): ProfileWorkflow | null {
  if (!isRecord(value) || !isRecord(value.workflow)) {
    return null;
  }

  const workflow = value.workflow;
  if (!Array.isArray(workflow.profiles) || workflow.profiles.length === 0) {
    return null;
  }

  const profiles: SavedProfile[] = [];
  for (const raw of workflow.profiles.slice(0, MAX_PROFILE_WORKFLOW_ITEMS)) {
    if (!isRecord(raw) || !isPlatform(raw.platform)) {
      continue;
    }

    const profile = parseProfile(raw, raw.platform, false, 'workflow.profile');
    if (profile) {
      profiles.push(profile);
    }
  }

  if (profiles.length === 0) {
    return null;
  }

  const index =
    typeof workflow.index === 'number' && Number.isFinite(workflow.index)
      ? Math.min(Math.max(0, Math.round(workflow.index)), profiles.length - 1)
      : 0;

  return {
    id: typeof workflow.id === 'string' ? workflow.id : createId('workflow'),
    profiles,
    index,
    createdAt:
      typeof workflow.createdAt === 'number' ? workflow.createdAt : Date.now(),
    updatedAt: Date.now(),
  };
}

export async function getProfileWorkflow(): Promise<ProfileWorkflow | null> {
  try {
    const stored = await chrome.storage.session.get(PROFILE_WORKFLOW_SESSION_KEY);
    return parseWorkflow(stored[PROFILE_WORKFLOW_SESSION_KEY]);
  } catch {
    return null;
  }
}

async function writeWorkflow(workflow: ProfileWorkflow | null): Promise<void> {
  if (!workflow) {
    await chrome.storage.session.remove(PROFILE_WORKFLOW_SESSION_KEY);
    return;
  }

  const envelope: WorkflowEnvelope = { version: 1, workflow };
  await chrome.storage.session.set({ [PROFILE_WORKFLOW_SESSION_KEY]: envelope });
}

export async function startProfileWorkflow(
  profiles: SavedProfile[],
): Promise<ProfileWorkflow> {
  const unique: SavedProfile[] = [];
  const seen = new Set<string>();

  for (const profile of profiles.slice(0, MAX_PROFILE_WORKFLOW_ITEMS)) {
    const key = profile.profileUrl || profile.username.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(profile);
  }

  if (unique.length === 0) {
    throw new AppError('INVALID_INPUT', 'Select at least one profile.');
  }

  const now = Date.now();
  const workflow: ProfileWorkflow = {
    id: createId('workflow'),
    profiles: unique,
    index: 0,
    createdAt: now,
    updatedAt: now,
  };

  await writeWorkflow(workflow);
  return workflow;
}

export async function advanceProfileWorkflow(
  workflow: ProfileWorkflow,
): Promise<ProfileWorkflow | null> {
  if (workflow.index + 1 >= workflow.profiles.length) {
    return null;
  }

  const next: ProfileWorkflow = {
    ...workflow,
    index: workflow.index + 1,
    updatedAt: Date.now(),
  };
  await writeWorkflow(next);
  return next;
}

export async function stopProfileWorkflow(): Promise<void> {
  await writeWorkflow(null);
}
