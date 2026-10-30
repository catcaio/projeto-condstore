import { ConsolidatedDashboardData, DashboardSnapshot } from '../types';

export interface DashboardStorageScope { tenantId: string; userId: string }

// Deliberately never read legacy global keys: their owner cannot be established.
function storageKey(scope: DashboardStorageScope, kind: 'active' | 'snapshots'): string {
  if (!scope.tenantId.trim() || !scope.userId.trim()) throw new Error('Dashboard storage requires an authenticated scope');
  return `exec_dash_v2:${encodeURIComponent(scope.tenantId)}:${encodeURIComponent(scope.userId)}:${kind}`;
}

export function saveActiveDashboardData(scope: DashboardStorageScope, data: ConsolidatedDashboardData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(scope, 'active'), JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar dados ativos no localStorage:', err);
  }
}

export function loadActiveDashboardData(scope: DashboardStorageScope): ConsolidatedDashboardData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(scope, 'active'));
    if (!raw) return null;
    return JSON.parse(raw) as ConsolidatedDashboardData;
  } catch (err) {
    console.error('Erro ao ler dados ativos do localStorage:', err);
    return null;
  }
}

export function saveSnapshotToStorage(scope: DashboardStorageScope, snapshot: DashboardSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadSnapshotsFromStorage(scope);
    const filtered = existing.filter((s) => s.periodId !== snapshot.periodId);
    const updated = [snapshot, ...filtered];
    localStorage.setItem(storageKey(scope, 'snapshots'), JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao salvar snapshot no localStorage:', err);
  }
}

export function loadSnapshotsFromStorage(scope: DashboardStorageScope): DashboardSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(scope, 'snapshots'));
    if (!raw) return [];
    return JSON.parse(raw) as DashboardSnapshot[];
  } catch (err) {
    console.error('Erro ao carregar snapshots do localStorage:', err);
    return [];
  }
}

export function clearDashboardStorage(scope: DashboardStorageScope): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(storageKey(scope, 'active'));
    localStorage.removeItem(storageKey(scope, 'snapshots'));
  } catch (err) {
    console.error('Erro ao limpar storage do dashboard:', err);
  }
}
