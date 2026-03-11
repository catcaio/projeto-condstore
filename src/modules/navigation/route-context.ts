import type { ClientActivityBucket, ClientStatus } from '@/modules/clientes/mock-data';
import type { ConversationPriority, ConversationStatus } from '@/modules/conversas/mock-data';
import type { LogisticsStatus } from '@/modules/logistica/mock-data';
import type { OrderChannel, OrderPriority, OrderStatus } from '@/modules/pedidos/mock-data';

export type ConversationsRouteContext = {
    conversationId?: string;
    clientId?: string;
    logisticsId?: string;
    status?: ConversationStatus;
    priority?: ConversationPriority;
};

export type ClientsRouteContext = {
    clientId?: string;
    status?: ClientStatus;
    tag?: string;
    activity?: ClientActivityBucket;
};

export type OrdersRouteContext = {
    orderId?: string;
    clientId?: string;
    status?: OrderStatus;
    channel?: OrderChannel;
    priority?: OrderPriority;
};

export type LogisticsExceptionFilter = 'com-excecao' | 'sem-excecao';

export type LogisticsRouteContext = {
    logisticsId?: string;
    orderId?: string;
    clientId?: string;
    status?: LogisticsStatus;
    exception?: LogisticsExceptionFilter;
    carrier?: string;
};

export type FreightSimulatorRouteContext = {
    orderId?: string;
};
