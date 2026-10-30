import {
  loadSnapshotsFromStorage,
  saveSnapshotToStorage,
  type DashboardStorageScope,
} from '../storage/dashboard-storage';
import { ConsolidatedDashboardData, DashboardSnapshot } from '../types';

export function createSnapshotFromData(
  scope: DashboardStorageScope,
  data: ConsolidatedDashboardData,
  periodLabel: string
): DashboardSnapshot {
  const dateObj = new Date();
  // The grouping denotes import time, never the unverified commercial observation period.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(dateObj);
  const periodId = `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}`;

  const snapshot: DashboardSnapshot = {
    id: `snap_${Date.now()}`,
    periodId,
    periodLabel: periodLabel || `Período ${periodId}`,
    importedAt: dateObj.toISOString(),
    channel: 'Mercado Livre',
    data,
  };

  saveSnapshotToStorage(scope, snapshot);
  return snapshot;
}

export function getSavedSnapshots(scope: DashboardStorageScope): DashboardSnapshot[] {
  return loadSnapshotsFromStorage(scope);
}
