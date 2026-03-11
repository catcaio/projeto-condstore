import type { ReadonlyURLSearchParams } from 'next/navigation';
import type {
    ClientsRouteContext,
    ConversationsRouteContext,
    FreightSimulatorRouteContext,
    LogisticsExceptionFilter,
    LogisticsRouteContext,
    OrdersRouteContext,
} from './route-context';

type SearchParamsLike = Pick<URLSearchParams, 'get'> | ReadonlyURLSearchParams;

const conversationStatuses = ['nova', 'aguardando-cliente', 'em-atendimento', 'escalada', 'resolvida'] as const;
const conversationPriorities = ['critica', 'alta', 'media', 'baixa'] as const;
const clientStatuses = ['ativo', 'monitorado', 'em-risco', 'vip'] as const;
const clientActivities = ['agora', 'hoje', 'recente'] as const;
const orderStatuses = ['recebido', 'em-analise', 'aprovado', 'faturado', 'expedido', 'concluido', 'excecao'] as const;
const orderChannels = ['WhatsApp', 'Portal', 'Inside Sales', 'B2B API'] as const;
const orderPriorities = ['critica', 'alta', 'media', 'baixa'] as const;
const logisticsStatuses = ['simulado', 'aguardando-aprovacao', 'coletado', 'em-transito', 'entregue', 'atrasado', 'excecao'] as const;

function getStringParam(searchParams: SearchParamsLike, key: string) {
    const value = searchParams.get(key)?.trim();
    return value ? value : undefined;
}

function getEnumParam<TValue extends string>(searchParams: SearchParamsLike, key: string, allowed: readonly TValue[]) {
    const value = getStringParam(searchParams, key);
    if (!value) {
        return undefined;
    }

    return allowed.find((allowedValue) => allowedValue.toLowerCase() === value.toLowerCase());
}

function getExceptionParam(searchParams: SearchParamsLike): LogisticsExceptionFilter | undefined {
    const value = getStringParam(searchParams, 'excecao')?.toLowerCase();
    if (!value) {
        return undefined;
    }

    if (['1', 'true', 'sim', 'com', 'com-excecao'].includes(value)) {
        return 'com-excecao';
    }

    if (['0', 'false', 'nao', 'não', 'sem', 'sem-excecao'].includes(value)) {
        return 'sem-excecao';
    }

    return undefined;
}

export function parseConversationsQueryState(searchParams: SearchParamsLike): ConversationsRouteContext {
    return {
        conversationId: getStringParam(searchParams, 'conversa'),
        clientId: getStringParam(searchParams, 'cliente'),
        logisticsId: getStringParam(searchParams, 'logistica'),
        status: getEnumParam(searchParams, 'status', conversationStatuses),
        priority: getEnumParam(searchParams, 'prioridade', conversationPriorities),
    };
}

export function parseClientsQueryState(
    searchParams: SearchParamsLike,
    options?: { availableTags?: readonly string[] }
): ClientsRouteContext {
    return {
        clientId: getStringParam(searchParams, 'cliente'),
        status: getEnumParam(searchParams, 'status', clientStatuses),
        activity: getEnumParam(searchParams, 'activity', clientActivities),
        tag: options?.availableTags?.length ? getEnumParam(searchParams, 'tag', options.availableTags) : getStringParam(searchParams, 'tag'),
    };
}

export function parseOrdersQueryState(searchParams: SearchParamsLike): OrdersRouteContext {
    return {
        orderId: getStringParam(searchParams, 'pedido'),
        clientId: getStringParam(searchParams, 'cliente'),
        status: getEnumParam(searchParams, 'status', orderStatuses),
        channel: getEnumParam(searchParams, 'canal', orderChannels),
        priority: getEnumParam(searchParams, 'prioridade', orderPriorities),
    };
}

export function parseLogisticsQueryState(
    searchParams: SearchParamsLike,
    options?: { carriers?: readonly string[] }
): LogisticsRouteContext {
    return {
        logisticsId: getStringParam(searchParams, 'logistica'),
        orderId: getStringParam(searchParams, 'pedido'),
        clientId: getStringParam(searchParams, 'cliente'),
        status: getEnumParam(searchParams, 'status', logisticsStatuses),
        exception: getExceptionParam(searchParams),
        carrier: options?.carriers?.length
            ? getEnumParam(searchParams, 'transportadora', options.carriers)
            : getStringParam(searchParams, 'transportadora'),
    };
}

export function parseFreightSimulatorQueryState(searchParams: SearchParamsLike): FreightSimulatorRouteContext {
    return {
        orderId: getStringParam(searchParams, 'pedido'),
    };
}
