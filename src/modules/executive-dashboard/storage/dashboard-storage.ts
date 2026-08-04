import { ConsolidatedDashboardData, DashboardSnapshot } from '../types';

const STORAGE_KEY_ACTIVE_DATA = 'exec_dash_active_data_v1';
const STORAGE_KEY_SNAPSHOTS = 'exec_dash_snapshots_v1';

export function saveActiveDashboardData(data: ConsolidatedDashboardData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_DATA, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar dados ativos no localStorage:', err);
  }
}

export function loadActiveDashboardData(): ConsolidatedDashboardData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_DATA);
    if (!raw) return null;
    return JSON.parse(raw) as ConsolidatedDashboardData;
  } catch (err) {
    console.error('Erro ao ler dados ativos do localStorage:', err);
    return null;
  }
}

export function saveSnapshotToStorage(snapshot: DashboardSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadSnapshotsFromStorage();
    const filtered = existing.filter((s) => s.periodId !== snapshot.periodId);
    const updated = [snapshot, ...filtered];
    localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(updated));
  } catch (err) {
    console.error('Erro ao salvar snapshot no localStorage:', err);
  }
}

export function loadSnapshotsFromStorage(): DashboardSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
    if (!raw) return [];
    return JSON.parse(raw) as DashboardSnapshot[];
  } catch (err) {
    console.error('Erro ao carregar snapshots do localStorage:', err);
    return [];
  }
}

export function clearDashboardStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_DATA);
    localStorage.removeItem(STORAGE_KEY_SNAPSHOTS);
  } catch (err) {
    console.error('Erro ao limpar storage do dashboard:', err);
  }
}
