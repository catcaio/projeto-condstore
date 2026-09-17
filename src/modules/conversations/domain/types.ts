export type ConversationStatus = 'nova' | 'aguardando-cliente' | 'em-atendimento' | 'escalada' | 'resolvida';

export type ConversationPriority = 'critica' | 'alta' | 'media' | 'baixa';

export type ConversationChannel = 'WhatsApp' | 'Email' | 'Portal';

export type ConversationActor = 'cliente' | 'humano' | 'ia';

export type ConversationMessage = {
    id: string;
    actor: ConversationActor;
    author: string;
    body: string;
    timestamp: string;
    delivery?: 'pendente' | 'enviado' | 'lido';
};

export type ConversationSimulation = {
    id: string;
    route: string;
    carrier: string;
    value: string;
    status: 'pendente' | 'aprovada' | 'contingencia';
};

export type ConversationOrder = {
    id: string;
    stage: string;
    promise: string;
    total: string;
    status: 'processando' | 'aguardando-aprovacao' | 'coleta' | 'entregue';
};

export type ConversationContextData = {
    customerSummary: string;
    accountHealth: string;
    region: string;
    tags: readonly string[];
    detectedIntent: string;
    recentSimulations: ConversationSimulation[];
    recentOrders: ConversationOrder[];
};

export type ConversationRecord = {
    id: string;
    relatedClientId: string;
    relatedLogisticsId: string;
    customerName: string;
    customerSegment: string;
    owner: string;
    status: ConversationStatus;
    priority: ConversationPriority;
    channel: ConversationChannel;
    lastMessage: string;
    lastMessageAt: string;
    waitingSince: string;
    unreadCount: number;
    relatedOrderId: string;
    relatedSimulationId: string;
    messages: ConversationMessage[];
    context: ConversationContextData;
};
