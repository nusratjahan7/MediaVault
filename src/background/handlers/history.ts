import {
  clearHistory,
  deleteHistoryEntry,
  queryHistory,
} from '@/storage/history';
import type {
  HistoryClearRequest,
  HistoryDeleteRequest,
  HistoryQueryRequest,
} from '@/types/messages';
import type { HistoryPage } from '@/types/history';

export async function handleHistoryQuery({
  query,
}: HistoryQueryRequest): Promise<HistoryPage> {
  return queryHistory(query);
}

export async function handleHistoryDelete({
  id,
}: HistoryDeleteRequest): Promise<{ deleted: boolean }> {
  return { deleted: await deleteHistoryEntry(id) };
}

export async function handleHistoryClear(
  _request: HistoryClearRequest,
): Promise<{ cleared: number }> {
  return { cleared: await clearHistory() };
}
