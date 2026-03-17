import type { OrderRecord } from '@/modules/orders';

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
