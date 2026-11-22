import {
  clearCompletedHistory,
  getDashboardSnapshot,
} from '@/storage/history';
import type { DashboardSnapshot } from '@/types/dashboard';

export async function handleDashboardQuery(): Promise<DashboardSnapshot> {
  return getDashboardSnapshot();
}

export async function handleDashboardClearCompleted(): Promise<{ cleared: number }> {
  return { cleared: await clearCompletedHistory() };
}
