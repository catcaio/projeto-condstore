import { mockOrders, type OrderRecord } from '@/modules/pedidos/mock-data';

export type LogisticsStatus =
    | 'simulado'
    | 'aguardando-aprovacao'
    | 'coletado'
    | 'em-transito'
    | 'entregue'
    | 'atrasado'
    | 'excecao';

export type LogisticsPriority = 'critica' | 'alta' | 'media' | 'baixa';

export type LogisticsPeriodBucket = 'hoje' | '24h' | '7d' | '30d';

export type LogisticsTimelineState = 'completed' | 'current' | 'pending' | 'issue';

export type LogisticsExceptionType = 'atraso' | 'erro-calculo' | 'ruptura' | 'reenvio' | 'redespacho';

export type FreightSimulationOption = {
    id: string;
    carrier: string;
    mode: string;
    value: string;
    eta: string;
    decision: 'escolhida' | 'descartada' | 'em-analise';
};

export type LogisticsTimelineStep = {
    label: LogisticsStatus;
    state: LogisticsTimelineState;
    timestamp?: string;
};

export type LogisticsEvent = {
    id: string;
    title: string;
    time: string;
    detail: string;
    tone?: 'info' | 'success' | 'warning' | 'critical';
};

export type LogisticsException = {
    id: string;
    type: LogisticsExceptionType;
    title: string;
    detail: string;
    severity: 'warning' | 'critical';
};

export type LogisticsRecord = {
    id: string;
    reference: string;
    order: OrderRecord;
    customerRegion: string;
    carrier: string;
    mode: string;
    origin: string;
    destination: string;
    promisedAt: string;
    status: LogisticsStatus;
    priority: LogisticsPriority;
    region: 'sudeste' | 'sul' | 'nordeste' | 'centro-oeste' | 'norte';
    periodBucket: LogisticsPeriodBucket;
    slaLabel: string;
    aging: string;
    updatedAt: string;
    hasException: boolean;
    timeline: LogisticsTimelineStep[];
    simulations: FreightSimulationOption[];
    events: LogisticsEvent[];
    exceptions: LogisticsException[];
};

const statuses: LogisticsStatus[] = ['simulado', 'aguardando-aprovacao', 'coletado', 'em-transito', 'entregue', 'atrasado', 'excecao'];
const priorities: LogisticsPriority[] = ['critica', 'alta', 'media', 'baixa'];
const periods: LogisticsPeriodBucket[] = ['hoje', '24h', '7d', '30d'];
const regions: LogisticsRecord['region'][] = ['sudeste', 'sul', 'nordeste', 'centro-oeste', 'norte'];
const carriers = ['Braspress', 'Jadlog', 'Total Express', 'Azul Cargo', 'Latam Cargo'] as const;
const modes = ['Rodoviario', 'Expresso', 'Aereo', 'Fracionado'] as const;
const origins = ['Sao Paulo, SP', 'Guarulhos, SP', 'Campinas, SP', 'Contagem, MG'] as const;

function money(value: number) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function getDestination(order: OrderRecord) {
    return order.customer.city;
}

function getPromisedAt(index: number, status: LogisticsStatus) {
    if (status === 'entregue') {
        return 'Entregue no prazo';
    }

    return index % 2 === 0 ? 'Hoje 18:00' : 'Amanha 14:00';
}

function getSlaLabel(status: LogisticsStatus) {
    if (status === 'atrasado' || status === 'excecao') {
        return 'SLA rompido';
    }
    if (status === 'entregue') {
        return 'SLA atendido';
    }
    return 'Dentro da janela';
}

function buildTimeline(status: LogisticsStatus, index: number): LogisticsTimelineStep[] {
    const labels: LogisticsStatus[] = ['simulado', 'aguardando-aprovacao', 'coletado', 'em-transito', 'entregue', 'atrasado', 'excecao'];
    const statusIndex = labels.indexOf(status);

    return labels.map((label, labelIndex) => {
        if (label === 'atrasado' || label === 'excecao') {
            return {
                label,
                state: status === label ? 'issue' : 'pending',
                timestamp:
                    status === label
                        ? `Hoje ${String(10 + (index % 6)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`
                        : undefined,
            };
        }

        if (status === 'atrasado' || status === 'excecao') {
            const completedThreshold = 4;
            if (labelIndex < completedThreshold) {
                return {
                    label,
                    state: 'completed',
                    timestamp: `Hoje ${String(8 + labelIndex).padStart(2, '0')}:${String((index * 5 + labelIndex * 7) % 60).padStart(2, '0')}`,
                };
            }

            return {
                label,
                state: 'pending',
            };
        }

        if (labelIndex < statusIndex) {
            return {
                label,
                state: 'completed',
                timestamp: `Hoje ${String(8 + labelIndex).padStart(2, '0')}:${String((index * 5 + labelIndex * 7) % 60).padStart(2, '0')}`,
            };
        }

        if (labelIndex === statusIndex) {
            return {
                label,
                state: 'current',
                timestamp: `Hoje ${String(10 + (index % 6)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
            };
        }

        return {
            label,
            state: 'pending',
        };
    });
}

function buildSimulations(index: number, chosenCarrier: string, chosenMode: string): FreightSimulationOption[] {
    return [
        {
            id: `SIM-${7100 + index}`,
            carrier: chosenCarrier,
            mode: chosenMode,
            value: money(84 + index * 4),
            eta: index % 2 === 0 ? '24h' : '48h',
            decision: 'escolhida',
        },
        {
            id: `SIM-${7200 + index}`,
            carrier: carriers[(index + 1) % carriers.length],
            mode: modes[(index + 1) % modes.length],
            value: money(77 + index * 3),
            eta: index % 3 === 0 ? '72h' : '48h',
            decision: index % 4 === 0 ? 'em-analise' : 'descartada',
        },
        {
            id: `SIM-${7300 + index}`,
            carrier: carriers[(index + 2) % carriers.length],
            mode: modes[(index + 2) % modes.length],
            value: money(96 + index * 2),
            eta: '24h',
            decision: 'descartada',
        },
    ];
}

function buildEvents(index: number, status: LogisticsStatus, carrier: string): LogisticsEvent[] {
    return [
        {
            id: `lg-evt-${index + 1}-1`,
            title: 'Simulacao consolidada na fila logistica',
            time: index < 6 ? `${5 + index} min` : 'Hoje 08:12',
            detail: `Cenario principal escolhido com ${carrier} e guard-rails de prazo e custo revisados.`,
            tone: 'info',
        },
        {
            id: `lg-evt-${index + 1}-2`,
            title: status === 'excecao' ? 'Intervencao humana registrada' : 'Atualizacao de status sincronizada',
            time: 'Hoje 09:18',
            detail:
                status === 'excecao'
                    ? 'Operador abriu excecao manual por ruptura entre simulacao aprovada e capacidade real da transportadora.'
                    : 'Mudanca de status refletida no acompanhamento operacional do pedido.',
            tone: status === 'excecao' ? 'critical' : 'success',
        },
        {
            id: `lg-evt-${index + 1}-3`,
            title: 'Observacao operacional adicionada',
            time: 'Hoje 10:06',
            detail: 'Dependencias de coleta, SLA e proxima melhor acao registradas para o turno atual.',
            tone: 'warning',
        },
    ];
}

function buildExceptions(index: number, status: LogisticsStatus): LogisticsException[] {
    if (status !== 'atrasado' && status !== 'excecao') {
        return [];
    }

    const types: LogisticsExceptionType[] = ['atraso', 'erro-calculo', 'ruptura', 'reenvio', 'redespacho'];
    const primaryType = types[index % types.length];

    return [
        {
            id: `ex-${index + 1}-1`,
            type: primaryType,
            title: primaryType === 'atraso' ? 'Atraso confirmado na rota' : primaryType === 'erro-calculo' ? 'Divergencia de calculo de frete' : primaryType === 'ruptura' ? 'Ruptura de capacidade da transportadora' : primaryType === 'reenvio' ? 'Reenvio necessario' : 'Redespacho em avaliacao',
            detail:
                primaryType === 'atraso'
                    ? 'Janela prometida estourou e exige alinhamento imediato com atendimento.'
                    : primaryType === 'erro-calculo'
                      ? 'Valor aprovado nao reflete o cenario real de modalidade e peso cubado.'
                      : primaryType === 'ruptura'
                        ? 'Transportadora sinalizou indisponibilidade operacional para a rota.'
                        : primaryType === 'reenvio'
                          ? 'Entrega inicial falhou e o pedido precisa de nova tentativa controlada.'
                          : 'Alternativa de redespacho aberta para preservar SLA revisado.',
            severity: status === 'excecao' ? 'critical' : 'warning',
        },
    ];
}

export const mockLogistics: LogisticsRecord[] = Array.from({ length: 30 }, (_, index) => {
    const order = mockOrders[index % mockOrders.length];
    const status = statuses[index % statuses.length];
    const carrier = carriers[index % carriers.length];
    const mode = modes[index % modes.length];

    return {
        id: `LG-${5100 + index}`,
        reference: `REF-${8200 + index}`,
        order,
        customerRegion: order.customer.city,
        carrier,
        mode,
        origin: origins[index % origins.length],
        destination: getDestination(order),
        promisedAt: getPromisedAt(index, status),
        status,
        priority: priorities[index % priorities.length],
        region: regions[index % regions.length],
        periodBucket: periods[index % periods.length],
        slaLabel: getSlaLabel(status),
        aging: index < 8 ? `${16 + index * 4} min` : `${1 + (index % 4)}h ${(index * 6) % 60}m`,
        updatedAt:
            index === 0
                ? 'Agora'
                : index < 6
                  ? `${index * 7} min`
                  : index < 16
                    ? `Hoje ${String(8 + (index % 8)).padStart(2, '0')}:${String((index * 8) % 60).padStart(2, '0')}`
                    : index % 2 === 0
                      ? 'Ontem'
                      : '2d',
        hasException: status === 'atrasado' || status === 'excecao',
        timeline: buildTimeline(status, index),
        simulations: buildSimulations(index, carrier, mode),
        events: buildEvents(index, status, carrier),
        exceptions: buildExceptions(index, status),
    };
});
