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

// --- EXTERNAL TENANTS (e.g. Marciano) ---

export const MARCIANO_SALAS: CockpitSala[] = [
    { id: 'vendas', label: 'Vendas', order: 10 },
    { id: 'operacao', label: 'Operação', order: 20 },
    { id: 'financeiro', label: 'Financeiro', order: 30 },
    { id: 'rh', label: 'Recursos Humanos', order: 40 },
    { id: 'relatorios', label: 'Relatórios', order: 50 },
];

export const MARCIANO_TILES: CockpitTile[] = [
    // VENDAS
    {
        id: 'marciano-cotacao',
        label: 'Nova Cotação',
        description: 'Simular frete para clientes',
        href: '/cotacao', // Real route
        iconName: 'Calculator',
        salaId: 'vendas',
        required: { roles: ['admin', 'manager', 'operator', 'viewer'] },
        order: 10,
    },
    {
        id: 'marciano-pedidos',
        label: 'Meus Pedidos',
        description: 'Gestão de ordens faturadas',
        href: '/cockpit/marciano/pedidos',
        iconName: 'PackageOpen',
        salaId: 'vendas',
        required: { roles: ['admin', 'manager', 'operator'] },
        order: 20,
    },

    // OPERAÇÃO
    {
        id: 'marciano-painel',
        label: 'Painel Logístico',
        description: 'Rastreio e despachos',
        href: '/painel-logistico', // Real route
        iconName: 'Truck',
        salaId: 'operacao',
        required: { roles: ['admin', 'manager', 'operator', 'viewer'] },
        order: 10,
    },
    {
        id: 'marciano-estoque',
        label: 'Estoque',
        description: 'Controle de inventário',
        href: '/cockpit/marciano/estoque',
        iconName: 'Boxes',
        salaId: 'operacao',
        required: { roles: ['admin', 'manager', 'operator'] },
        order: 20,
    },

    // FINANCEIRO
    {
        id: 'marciano-faturas',
        label: 'Faturas',
        description: 'Boletos e notas fiscais',
        href: '/cockpit/marciano/faturas',
        iconName: 'Receipt',
        salaId: 'financeiro',
        required: { roles: ['admin', 'manager'] },
        order: 10,
    },
    {
        id: 'marciano-billing',
        label: 'Assinatura',
        description: 'Plano CONDSTORE',
        href: '/billing', // Real route
        iconName: 'CreditCard',
        salaId: 'financeiro',
        required: { roles: ['admin'] },
        order: 20,
    },

    // RH
    {
        id: 'marciano-equipe',
        label: 'Equipe',
        description: 'Membros e acessos',
        href: '/settings', // Real route
        iconName: 'Users',
        salaId: 'rh',
        required: { roles: ['admin'] },
        order: 10,
    },

    // RELATÓRIOS
    {
        id: 'marciano-analytics',
        label: 'Desempenho',
        description: 'Métricas gerais da loja',
        href: '/cockpit/marciano/analytics',
        iconName: 'LineChart',
        salaId: 'relatorios',
        required: { roles: ['admin', 'manager'] },
        order: 10,
    },
];
