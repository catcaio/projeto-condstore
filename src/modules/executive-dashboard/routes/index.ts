export const EXECUTIVE_DASHBOARD_ROUTES = {
  HOME: '/executive-dashboard',
  IMPORT: '/executive-dashboard#import',
  HISTORY: '/executive-dashboard#history',
} as const;

export interface NavItem {
  id: 'dashboard' | 'import' | 'history' | 'channels';
  label: string;
  badge?: string;
  iconName: string;
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Visão Geral (KPIs)', iconName: 'LayoutDashboard' },
  { id: 'import', label: 'Importar Relatórios ML', badge: 'Excel', iconName: 'Upload' },
  { id: 'history', label: 'Histórico & Snapshots', iconName: 'History' },
  { id: 'channels', label: 'Canais & Conectores', badge: 'Em breve', iconName: 'Layers' },
];
