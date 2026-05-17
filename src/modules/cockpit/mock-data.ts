import type {
    CockpitActionQueueItem,
    CockpitAlert,
    CockpitEvent,
    CockpitMetric,
    CockpitShortcut,
    SystemStatusItem,
} from './data/shared';

export const cockpitMetrics: CockpitMetric[] = [
    {
        id: 'active-conversations',
        label: 'Conversas ativas',
        value: 'N/A',
        helper: 'Dados indisponíveis (fallback).',
        tone: 'neutral',
        href: '#',
    },
    {
        id: 'orders-processing',
        label: 'Pedidos em processamento',
        value: 'N/A',
        helper: 'Dados indisponíveis (fallback).',
        tone: 'neutral',
        href: '#',
    },
    {
        id: 'simulations-today',
        label: 'Simulações de frete hoje',
        value: 'N/A',
        helper: 'Dados indisponíveis (fallback).',
        tone: 'neutral',
        href: '#',
    },
    {
        id: 'exceptions',
        label: 'Erros e exceções',
        value: 'N/A',
        helper: 'Dados indisponíveis (fallback).',
        tone: 'neutral',
        href: '#',
    },
];

export const cockpitAlerts: CockpitAlert[] = [];

export const cockpitEvents: CockpitEvent[] = [];

export const cockpitActionQueue: CockpitActionQueueItem[] = [];

export const cockpitSystemStatus: SystemStatusItem[] = [
    {
        id: 'redis',
        label: 'Redis',
        status: 'warning',
        detail: 'Diagnostico indisponivel (fallback).',
    },
    {
        id: 'db',
        label: 'DB',
        status: 'warning',
        detail: 'Diagnostico indisponivel (fallback).',
    },
    {
        id: 'ai-provider',
        label: 'AI Provider',
        status: 'warning',
        detail: 'Diagnostico indisponivel (fallback).',
    },
    {
        id: 'webhook',
        label: 'Webhook',
        status: 'warning',
        detail: 'Diagnostico indisponivel (fallback).',
    },
];

export const cockpitShortcuts: CockpitShortcut[] = [];

