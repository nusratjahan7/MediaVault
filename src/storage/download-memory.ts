import { DOWNLOAD_MEMORY_STORAGE_KEY } from '@/constants';
import type { DownloadSource } from '@/types/download';

const MAX_MEMORY_ENTRIES = 5_000;

interface DownloadMemoryEnvelope {
  version: 1;
  entries: Record<string, number>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function downloadFingerprint(source: Pick<DownloadSource, 'platform' | 'id' | 'postId' | 'kind'>): string {
  return `${source.platform}:${source.postId ?? source.id}:${source.kind}`;
}

function parseMemory(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const entries = isRecord(value.entries) ? value.entries : {};
  const parsed: Record<string, number> = {};

  for (const [key, timestamp] of Object.entries(entries)) {
    if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
      parsed[key] = timestamp;
    }
  }

  return parsed;
}

async function readMemory(): Promise<Record<string, number>> {
  try {
    const stored = await chrome.storage.local.get(DOWNLOAD_MEMORY_STORAGE_KEY);
    return parseMemory(stored[DOWNLOAD_MEMORY_STORAGE_KEY]);
  } catch {
    return {};
  }
}

async function writeMemory(entries: Record<string, number>): Promise<void> {
  const keys = Object.keys(entries);
  if (keys.length > MAX_MEMORY_ENTRIES) {
    const kept = keys
      .sort((a, b) => (entries[b] ?? 0) - (entries[a] ?? 0))
      .slice(0, MAX_MEMORY_ENTRIES);
    const trimmed: Record<string, number> = {};
    for (const key of kept) {
      trimmed[key] = entries[key] ?? 0;
    }
    entries = trimmed;
  }

  const envelope: DownloadMemoryEnvelope = { version: 1, entries };
  await chrome.storage.local.set({ [DOWNLOAD_MEMORY_STORAGE_KEY]: envelope });
}

export async function hasDownloadedFingerprint(
  source: Pick<DownloadSource, 'platform' | 'id' | 'postId' | 'kind'>,
): Promise<boolean> {
  const memory = await readMemory();
  return Boolean(memory[downloadFingerprint(source)]);
}

export async function markDownloadedFingerprint(
  source: Pick<DownloadSource, 'platform' | 'id' | 'postId' | 'kind'>,
): Promise<void> {
  const memory = await readMemory();
  memory[downloadFingerprint(source)] = Date.now();
  await writeMemory(memory);
}

export async function clearDownloadMemory(): Promise<void> {
  await chrome.storage.local.remove(DOWNLOAD_MEMORY_STORAGE_KEY);
}
