export type ClientStatus = 'ativo' | 'monitorado' | 'em-risco' | 'vip';

export type CrmStage = 'new_lead' | 'qualified' | 'quoted' | 'proposal_sent' | 'negotiating' | 'won' | 'lost';

export type ClientOpportunity = {
    id: string;
    stage: CrmStage;
    title: string;
    amount: string;
    lastActivityAt: string;
};

export type ClientActivityBucket = 'agora' | 'hoje' | 'recente';

export type ClientConversationStatus = 'aberta' | 'em-atendimento' | 'escalada' | 'resolvida';

export type ClientOrderStatus = 'processando' | 'aguardando-aprovacao' | 'coleta' | 'entregue';

export type ClientSimulationStatus = 'pendente' | 'aprovada' | 'contingencia';

export type ClientConversationActivity = {
    id: string;
    channel: 'WhatsApp' | 'Email' | 'Portal';
    title: string;
    owner: string;
    status: ClientConversationStatus;
    updatedAt: string;
};

export type ClientOrderActivity = {
    id: string;
    status: ClientOrderStatus;
    total: string;
    updatedAt: string;
};

export type ClientSimulationActivity = {
    id: string;
    carrier: string;
    route: string;
    value: string;
    status: ClientSimulationStatus;
    updatedAt: string;
};

export type ClientRecord = {
    id: string;
    name: string;
    company: string;
    contact: string;
    email: string;
    phone: string;
    city: string;
    segment: string;
    status: ClientStatus;
    activityBucket: ClientActivityBucket;
    lastActivity: string;
    orderCount: number;
    conversationCount: number;
    simulationCount: number;
    averageTicket: string;
    lastInteraction: string;
    summary: string;
    tags: readonly string[];
    conversations: ClientConversationActivity[];
    orders: ClientOrderActivity[];
    simulations: ClientSimulationActivity[];
    opportunity?: ClientOpportunity;
};
