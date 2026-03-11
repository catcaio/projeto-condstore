import { mockClients, type ClientRecord } from '@/modules/clientes/mock-data';

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

const statuses: OrderStatus[] = ['recebido', 'em-analise', 'aprovado', 'faturado', 'expedido', 'concluido', 'excecao'];
const priorities: OrderPriority[] = ['critica', 'alta', 'media', 'baixa'];
const channels: OrderChannel[] = ['WhatsApp', 'Portal', 'Inside Sales', 'B2B API'];
const periods: OrderPeriodBucket[] = ['hoje', '24h', '7d', '30d'];
const owners = ['Marina CX', 'Henrique Ops', 'Camila CX', 'Joao Sales', 'Bianca Freight'] as const;
const carriers = ['Braspress', 'Jadlog', 'Total Express', 'Azul Cargo', 'Latam Cargo'] as const;
const modes = ['Rodoviario', 'Expresso', 'Aereo', 'Fracionado'] as const;
const productCatalog = [
    'Kit promocional de reposicao',
    'Lote especial de giro rapido',
    'Caixa master de abastecimento',
    'Pack de itens premium',
    'Volume complementar de campanha',
] as const;

function money(value: number) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function buildItems(orderIndex: number): OrderLineItem[] {
    return Array.from({ length: 3 }, (_, itemIndex) => {
        const quantity = 2 + ((orderIndex + itemIndex) % 5);
        const subtotalValue = 48 + orderIndex * 9 + itemIndex * 17;

        return {
            id: `item-${orderIndex + 1}-${itemIndex + 1}`,
            sku: `SKU-${orderIndex + 1}${itemIndex + 1}${100 + itemIndex}`,
            name: productCatalog[(orderIndex + itemIndex) % productCatalog.length],
            quantity,
            subtotal: money(subtotalValue * quantity),
        };
    });
}

function buildTimeline(status: OrderStatus, orderIndex: number): OrderTimelineStep[] {
    const labels: OrderStatus[] = ['recebido', 'em-analise', 'aprovado', 'faturado', 'expedido', 'concluido', 'excecao'];
    const statusIndex = labels.indexOf(status);
    const exceptionBaseIndex = 3;

    return labels.map((label, index) => {
        if (label === 'excecao') {
            return {
                label,
                state: status === 'excecao' ? 'issue' : 'pending',
                timestamp: status === 'excecao' ? `Hoje ${String(10 + (orderIndex % 6)).padStart(2, '0')}:${String((orderIndex * 7) % 60).padStart(2, '0')}` : undefined,
            };
        }

        if (status === 'excecao') {
            if (index < exceptionBaseIndex) {
                return {
                    label,
                    state: 'completed',
                    timestamp: `Hoje ${String(8 + index).padStart(2, '0')}:${String((orderIndex * 5 + index * 8) % 60).padStart(2, '0')}`,
                };
            }

            return {
                label,
                state: 'pending',
            };
        }

        if (index < statusIndex) {
            return {
                label,
                state: 'completed',
                timestamp: `Hoje ${String(8 + index).padStart(2, '0')}:${String((orderIndex * 5 + index * 8) % 60).padStart(2, '0')}`,
            };
        }

        if (index === statusIndex) {
            return {
                label,
                state: 'current',
                timestamp: `Hoje ${String(10 + (orderIndex % 6)).padStart(2, '0')}:${String((orderIndex * 7) % 60).padStart(2, '0')}`,
            };
        }

        return {
            label,
            state: 'pending',
        };
    });
}

function buildEvents(orderIndex: number, customerName: string, status: OrderStatus): OrderEvent[] {
    return [
        {
            id: `evt-${orderIndex + 1}-1`,
            title: 'Pedido recebido e triado',
            time: orderIndex < 6 ? `${6 + orderIndex} min` : 'Hoje 08:10',
            detail: `${customerName} entrou no fluxo operacional com origem consolidada e ownership inicial definido.`,
            tone: 'info',
        },
        {
            id: `evt-${orderIndex + 1}-2`,
            title: status === 'excecao' ? 'Excecao marcada para resposta manual' : 'Atualizacao de status registrada',
            time: 'Hoje 09:24',
            detail:
                status === 'excecao'
                    ? 'Pedido movido para excecao por divergencia entre promessa comercial e disponibilidade logistica.'
                    : 'Mudanca de etapa registrada com rastreabilidade operacional para comercial e logistica.',
            tone: status === 'excecao' ? 'critical' : 'success',
        },
        {
            id: `evt-${orderIndex + 1}-3`,
            title: 'Observacao interna adicionada',
            time: 'Hoje 10:02',
            detail: 'Operador registrou proxima acao recomendada e dependencia externa quando necessario.',
            tone: 'warning',
        },
    ];
}

function buildLogistics(orderIndex: number, status: OrderStatus): OrderLogisticsContext {
    const carrier = carriers[orderIndex % carriers.length];
    const mode = modes[orderIndex % modes.length];
    const logisticsStatus =
        status === 'recebido' || status === 'em-analise'
            ? 'aguardando-cotacao'
            : status === 'aprovado' || status === 'faturado'
              ? 'em-separacao'
              : status === 'expedido' || status === 'concluido'
                ? 'tracking-ativo'
                : 'com-excecao';

    return {
        carrier,
        mode,
        logisticsStatus,
        forecast: status === 'concluido' ? 'Entregue' : status === 'expedido' ? 'Amanha 14:00' : 'Hoje 18:00',
        exception:
            status === 'excecao'
                ? 'Divergencia de coleta e necessidade de contingencia de transportadora.'
                : undefined,
        quoteId: `SIM-${6200 + orderIndex}`,
    };
}

function getTotal(items: OrderLineItem[]) {
    const total = items.reduce((accumulator, item) => {
        const normalized = Number(item.subtotal.replace('R$ ', '').replace('.', '').replace(',', '.'));
        return accumulator + normalized;
    }, 0);

    return money(total);
}

function getOrigin(channel: OrderChannel) {
    if (channel === 'WhatsApp') {
        return 'Negociacao assistida no atendimento';
    }
    if (channel === 'Portal') {
        return 'Portal do cliente com validacao operacional';
    }
    if (channel === 'Inside Sales') {
        return 'Inside sales com handoff comercial';
    }
    return 'Integracao B2B com triagem automatizada';
}

export const mockOrders: OrderRecord[] = Array.from({ length: 30 }, (_, orderIndex) => {
    const customer = mockClients[orderIndex % mockClients.length];
    const status = statuses[orderIndex % statuses.length];
    const priority = priorities[orderIndex % priorities.length];
    const channel = channels[orderIndex % channels.length];
    const items = buildItems(orderIndex);

    return {
        id: `${1830 + orderIndex}`,
        customer,
        status,
        priority,
        channel,
        owner: owners[orderIndex % owners.length],
        total: getTotal(items),
        aging: orderIndex < 8 ? `${18 + orderIndex * 4} min` : `${1 + (orderIndex % 4)}h ${(orderIndex * 7) % 60}m`,
        updatedAt:
            orderIndex === 0
                ? 'Agora'
                : orderIndex < 6
                  ? `${orderIndex * 6} min`
                  : orderIndex < 16
                    ? `Hoje ${String(8 + (orderIndex % 8)).padStart(2, '0')}:${String((orderIndex * 9) % 60).padStart(2, '0')}`
                    : orderIndex % 2 === 0
                      ? 'Ontem'
                      : '2d',
        periodBucket: periods[orderIndex % periods.length],
        origin: getOrigin(channel),
        createdAt: `2026-03-${String(1 + (orderIndex % 11)).padStart(2, '0')} ${String(8 + (orderIndex % 8)).padStart(2, '0')}:15`,
        items,
        timeline: buildTimeline(status, orderIndex),
        events: buildEvents(orderIndex, customer.company, status),
        logistics: buildLogistics(orderIndex, status),
    };
});
