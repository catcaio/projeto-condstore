import {
  loadSnapshotsFromStorage,
  saveSnapshotToStorage,
} from '../storage/dashboard-storage';
import { ConsolidatedDashboardData, DashboardSnapshot } from '../types';

export function createSnapshotFromData(
  data: ConsolidatedDashboardData,
  periodLabel: string
): DashboardSnapshot {
  const dateObj = new Date();
  const periodId = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

  const snapshot: DashboardSnapshot = {
    id: `snap_${Date.now()}`,
    periodId,
    periodLabel: periodLabel || `Período ${periodId}`,
    importedAt: dateObj.toISOString(),
    channel: 'Mercado Livre',
    data,
  };

  saveSnapshotToStorage(snapshot);
  return snapshot;
}

export function getSavedSnapshots(): DashboardSnapshot[] {
  return loadSnapshotsFromStorage();
}
