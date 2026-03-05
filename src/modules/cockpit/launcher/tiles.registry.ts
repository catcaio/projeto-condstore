import { Role } from '@/ui/auth/entitlements-logic';

export type CockpitBadgeType = 'new' | 'beta' | 'update' | 'danger';

export interface CockpitSala {
    id: string;
    label: string;
    order: number;
}

export interface CockpitTile {
    id: string;
    label: string;
    description?: string;
    href: string;
    iconName: string; // We'll map this string to a Lucide icon component in the UI
    salaId: string;
    required: {
        roles?: Role[];
        // Future extension: permissions?: PermissionCode[];
    };
    badge?: {
        type: CockpitBadgeType;
        label: string;
    };
    order: number;
}

export const SALAS_PADRAO: CockpitSala[] = [
    { id: 'operations', label: 'Operações', order: 10 },
    { id: 'finance', label: 'Financeiro', order: 20 },
    { id: 'intelligence', label: 'Inteligência', order: 30 },
    { id: 'settings', label: 'Configurações', order: 40 },
    { id: 'admin', label: 'Administração', order: 50 },
    { id: 'internal', label: 'Interno (Dev)', order: 90 },
];

export const COCKPIT_TILES: CockpitTile[] = [
    // -- OPERATIONS --
    {
        id: 'overview',
        label: 'Visão Geral',
        description: 'Acompanhe métricas, saúde e faturamento do seu painel',
        href: '/cockpit/overview',
        iconName: 'LayoutDashboard',
        salaId: 'operations',
        required: { roles: ['admin', 'manager', 'operator', 'viewer'] },
        order: 10,
    },
    {
        id: 'painel-logistico',
        label: 'Painel Logístico',
        description: 'Gestão de fretes e cotações',
        href: '/painel-logistico',
        iconName: 'Truck',
        salaId: 'operations',
        required: { roles: ['admin', 'manager', 'operator', 'viewer'] },
        order: 20,
    },
    {
        id: 'domine',
        label: 'Domine (Eventos)',
        description: 'Visualização da malha v1 e DLQ de fretes',
        href: '/cockpit/domine',
        iconName: 'Workflow',
        salaId: 'operations',
        required: { roles: ['admin', 'manager'] },
        order: 30,
    },
    {
        id: 'inbox',
        label: 'Inbox',
        description: 'Atendimentos do Copilot e interações',
        href: '/inbox',
        iconName: 'MessageSquareText',
        salaId: 'operations',
        required: { roles: ['admin', 'manager', 'operator'] },
        order: 40,
    },

    // -- INTELLIGENCE --
    {
        id: 'analytics',
        label: 'Analytics',
        description: 'Métricas de aquisição e conversão do Funil',
        href: '/cockpit/analytics',
        iconName: 'BarChart3',
        salaId: 'intelligence',
        required: { roles: ['admin', 'manager'] },
        badge: { type: 'beta', label: 'Beta' },
        order: 10,
    },
    {
        id: 'knowledge',
        label: 'Base do Copilot',
        description: 'Gestão de conhecimento para a IA',
        href: '/cockpit/knowledge',
        iconName: 'BrainCircuit',
        salaId: 'intelligence',
        required: { roles: ['admin', 'manager'] },
        order: 20,
    },

    // -- FINANCE --
    {
        id: 'finops',
        label: 'FinOps & Billing',
        description: 'Gestão de limites, bloqueios e billing',
        href: '/cockpit/finops',
        iconName: 'CircleDollarSign',
        salaId: 'finance',
        required: { roles: ['admin'] },
        order: 10,
    },

    // -- SETTINGS --
    {
        id: 'settings-security',
        label: 'Segurança',
        description: 'Tokens de API, rate limits e logs',
        href: '/cockpit/settings/security',
        iconName: 'ShieldAlert',
        salaId: 'settings',
        required: { roles: ['admin'] },
        order: 10,
    },
    {
        id: 'privacy',
        label: 'Privacidade (LGPD)',
        description: 'Purge e gestão de dados sensíveis',
        href: '/cockpit/privacy',
        iconName: 'UserX',
        salaId: 'settings',
        required: { roles: ['admin'] },
        order: 20,
    },

    // -- ADMIN --
    {
        id: 'organization',
        label: 'Organização',
        description: 'Gerenciar membros, convites e acessos',
        href: '/settings', // current path to org management
        iconName: 'Users',
        salaId: 'admin',
        required: { roles: ['admin'] },
        order: 10,
    },
    {
        id: 'audit',
        label: 'Auditoria',
        description: 'Trail completo de atividades',
        href: '/cockpit/audit',
        iconName: 'ListChecks',
        salaId: 'admin',
        required: { roles: ['admin'] },
        order: 20,
    },

    // -- INTERNAL (DEV/SYSTEM) --
    {
        id: 'status',
        label: 'System Status',
        description: 'Monitoramento global do CONDSTORE OS',
        href: '/cockpit/status',
        iconName: 'Activity',
        salaId: 'internal',
        required: { roles: ['admin'] },
        badge: { type: 'danger', label: 'Restrito' },
        order: 10,
    },
];
