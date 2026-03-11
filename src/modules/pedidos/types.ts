import type { ClientRecord } from '@/modules/clientes/types';

export type OrderStatus = 'recebido' | 'em-analise' | 'aprovado' | 'faturado' | 'expedido' | 'concluido' | 'excecao';

export type OrderPriority = 'critica' | 'alta' | 'media' | 'baixa';

export type OrderChannel = 'WhatsApp' | 'Portal' | 'Inside Sales' | 'B2B API';

export type OrderPeriodBucket = 'hoje' | '24h' | '7d' | '30d';

export type OrderTimelineState = 'completed' | 'current' | 'pending' | 'issue';

export type OrderLineItem = {
    id: string;
    sku: string;
    name: string;
    quantity: number;
    subtotal: string;
};

export type OrderTimelineStep = {
    label: OrderStatus;
    state: OrderTimelineState;
    timestamp?: string;
};

export type OrderEvent = {
    id: string;
    title: string;
    time: string;
    detail: string;
    tone?: 'info' | 'success' | 'warning' | 'critical';
};

export type OrderLogisticsContext = {
    carrier: string;
    mode: string;
    logisticsStatus: 'coleta-agendada' | 'em-separacao' | 'aguardando-cotacao' | 'tracking-ativo' | 'com-excecao';
    forecast: string;
    exception?: string;
    quoteId: string;
};

export type OrderRecord = {
    id: string;
    customer: ClientRecord;
    status: OrderStatus;
    priority: OrderPriority;
    channel: OrderChannel;
    owner: string;
    total: string;
    aging: string;
    updatedAt: string;
    periodBucket: OrderPeriodBucket;
    origin: string;
    createdAt: string;
    items: OrderLineItem[];
    timeline: OrderTimelineStep[];
    events: OrderEvent[];
    logistics: OrderLogisticsContext;
};
