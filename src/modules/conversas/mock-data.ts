import { mockClients } from '@/modules/clientes/mock-data';
import { mockLogistics } from '@/modules/logistica/mock-data';
import { mockOrders } from '@/modules/pedidos/mock-data';

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

const owners = ['Marina CX', 'Henrique Ops', 'Camila CX', 'Joao Sales', 'Bianca Freight'] as const;
const statuses: ConversationStatus[] = ['nova', 'em-atendimento', 'aguardando-cliente', 'escalada', 'resolvida'];
const priorities: ConversationPriority[] = ['critica', 'alta', 'media', 'baixa'];
const channels: ConversationChannel[] = ['WhatsApp', 'Email', 'Portal'];

const conversationSeeds = [
    {
        customerName: 'Loja Riacho',
        customerSegment: 'Varejo regional',
        intent: 'atraso de coleta',
        summary: 'Cliente recorrente com alto peso em recompra e sensibilidade a promessas de entrega.',
        region: 'Fortaleza, CE',
        baseMessage: 'Preciso saber se o pedido ainda sai hoje porque o prazo prometido venceu.',
        tags: ['premium', 'recompra', 'atraso'],
    },
    {
        customerName: 'Casa Norte',
        customerSegment: 'Distribuicao',
        intent: 'confirmacao de coleta',
        summary: 'Conta com pedidos fracionados e volume concentrado no Nordeste.',
        region: 'Recife, PE',
        baseMessage: 'Conseguem confirmar a janela de coleta antes do fechamento do CD?',
        tags: ['b2b', 'coleta', 'janela'],
    },
    {
        customerName: 'Atacado Lima',
        customerSegment: 'Atacado alimentar',
        intent: 'reclamacao de prazo',
        summary: 'Cliente em risco por divergencia recente entre SLA prometido e tracking real.',
        region: 'Goiania, GO',
        baseMessage: 'O rastreio nao bate com o prazo que o comercial me passou.',
        tags: ['risco', 'prazo', 'tracking'],
    },
    {
        customerName: 'Mercado Vitta',
        customerSegment: 'Supermercado',
        intent: 'simulacao emergencial',
        summary: 'Operacao com cotacoes recorrentes e decisao rapida baseada em margem e prazo.',
        region: 'Ribeirao Preto, SP',
        baseMessage: 'Preciso comparar duas transportadoras para liberar o pedido agora.',
        tags: ['simulacao', 'urgente', 'margem'],
    },
    {
        customerName: 'Construmais',
        customerSegment: 'Material de construcao',
        intent: 'pedido travado',
        summary: 'Conta de grande ticket com handoff frequente entre vendas e logistica.',
        region: 'Campinas, SP',
        baseMessage: 'O pedido ficou parado na aprovacao e preciso de retorno ainda neste turno.',
        tags: ['pedido', 'aprovacao', 'alto-ticket'],
    },
    {
        customerName: 'Drogaria Central',
        customerSegment: 'Farmacia',
        intent: 'segunda via de comprovante',
        summary: 'Cliente com alto volume de atendimento assinado por compliance e rastreabilidade.',
        region: 'Belo Horizonte, MG',
        baseMessage: 'Podem reenviar o comprovante de entrega do lote anterior?',
        tags: ['compliance', 'comprovante', 'documento'],
    },
    {
        customerName: 'Autopecas Delta',
        customerSegment: 'Autopecas',
        intent: 'divergencia de frete',
        summary: 'Conta orientada a custo logistico e com sensibilidade a ruptura de margem.',
        region: 'Curitiba, PR',
        baseMessage: 'O frete aprovado ontem mudou no carrinho do pedido atual.',
        tags: ['frete', 'margem', 'revisao'],
    },
    {
        customerName: 'Grupo Horizonte',
        customerSegment: 'Distribuicao nacional',
        intent: 'escalonamento comercial',
        summary: 'Conta enterprise com SLA rigido e aprovacoes fora da alcada operacional.',
        region: 'Sao Paulo, SP',
        baseMessage: 'Preciso falar com um gestor porque o pedido nao pode virar o dia.',
        tags: ['enterprise', 'escalonamento', 'sla'],
    },
    {
        customerName: 'Padaria Imperial',
        customerSegment: 'Food service',
        intent: 'alteracao de endereco',
        summary: 'Pequena operacao com alta frequencia e pouca tolerancia a erro operacional.',
        region: 'Niteroi, RJ',
        baseMessage: 'Mudou o endereco de entrega e preciso ajustar a rota antes da coleta.',
        tags: ['rota', 'cadastro', 'coleta'],
    },
    {
        customerName: 'TechLab Pro',
        customerSegment: 'Eletronicos',
        intent: 'pedido parcial',
        summary: 'Conta com embarques fracionados e visibilidade rigorosa de itens pendentes.',
        region: 'Barueri, SP',
        baseMessage: 'Uma parte do pedido saiu e outra nao apareceu no tracking.',
        tags: ['pedido-parcial', 'tracking', 'suporte'],
    },
    {
        customerName: 'Armazem do Vale',
        customerSegment: 'Mercearia',
        intent: 'duvida de faturamento',
        summary: 'Atendimento misto entre operacao e financeiro, ainda sem trilha consolidada.',
        region: 'Joinville, SC',
        baseMessage: 'O valor faturado nao fechou com a simulacao aprovada.',
        tags: ['faturamento', 'simulacao', 'divergencia'],
    },
    {
        customerName: 'Eletro Prime',
        customerSegment: 'E-commerce',
        intent: 'whatsapp sem retorno',
        summary: 'Conta digital que mede tempo de primeira resposta e reabertura de conversa.',
        region: 'Guarulhos, SP',
        baseMessage: 'Enviei mensagem cedo e ainda nao tive retorno do atendimento.',
        tags: ['whatsapp', 'sla', 'reabertura'],
    },
    {
        customerName: 'Casa Verde',
        customerSegment: 'Home decor',
        intent: 'cancelamento preventivo',
        summary: 'Conta em observacao por risco de churn quando prazo logistico se degrada.',
        region: 'Florianopolis, SC',
        baseMessage: 'Se nao tiver previsao confiavel vou precisar cancelar o pedido.',
        tags: ['cancelamento', 'churn', 'prazo'],
    },
    {
        customerName: 'Bebidas Aurora',
        customerSegment: 'Distribuidor',
        intent: 'janela de entrega',
        summary: 'Cliente orientado a janela fixa e recebimento assistido por equipe local.',
        region: 'Salvador, BA',
        baseMessage: 'A entrega precisa acontecer antes das 16h por restricao do recebimento.',
        tags: ['janela', 'restricao', 'entrega'],
    },
    {
        customerName: 'Moda Leste',
        customerSegment: 'Fashion retail',
        intent: 'reabertura de atendimento',
        summary: 'Conta sensivel a experiencia de atendimento e com historico de recontato rapido.',
        region: 'Sao Jose dos Campos, SP',
        baseMessage: 'Estou retomando o caso porque a resposta anterior nao resolveu.',
        tags: ['reabertura', 'cx', 'prioridade'],
    },
    {
        customerName: 'Clinica Viva',
        customerSegment: 'Saude',
        intent: 'urgencia de entrega',
        summary: 'Conta com itens sensiveis e tolerancia operacional muito baixa.',
        region: 'Brasilia, DF',
        baseMessage: 'Esse material precisa ser entregue hoje sem falta.',
        tags: ['urgente', 'saude', 'sensivel'],
    },
    {
        customerName: 'Metalurgica Sudoeste',
        customerSegment: 'Industria',
        intent: 'restricao de veiculo',
        summary: 'Operacao com regras especificas de acesso, peso e janela de descarga.',
        region: 'Sorocaba, SP',
        baseMessage: 'A transportadora escolhida entra com truck ou precisa de toco?',
        tags: ['veiculo', 'regra', 'descarga'],
    },
    {
        customerName: 'Livraria Atlas',
        customerSegment: 'Editorial',
        intent: 'rastreio parado',
        summary: 'Conta de medio volume com alto uso de email para follow-up operacional.',
        region: 'Porto Alegre, RS',
        baseMessage: 'O rastreio parou ontem e o cliente final esta cobrando.',
        tags: ['email', 'tracking', 'follow-up'],
    },
    {
        customerName: 'Agro Serra',
        customerSegment: 'Agro distribuicao',
        intent: 'cotacao de contingencia',
        summary: 'Conta com pedido sazonal e necessidade de contingencia por rota longa.',
        region: 'Cuiaba, MT',
        baseMessage: 'Quero uma alternativa de frete porque a transportadora principal falhou.',
        tags: ['contingencia', 'agro', 'rota-longa'],
    },
    {
        customerName: 'Papelaria Ponto',
        customerSegment: 'Papelaria',
        intent: 'duvida de pedido',
        summary: 'Conta de baixo ticket com alto volume de atendimento repetitivo.',
        region: 'Maceio, AL',
        baseMessage: 'Nao entendi se meu pedido foi confirmado ou ainda esta em analise.',
        tags: ['baixo-ticket', 'pedido', 'duvida'],
    },
] as const;

function toClock(hour: number, minute: number) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function buildMessages(seed: (typeof conversationSeeds)[number], customerName: string, index: number, owner: string): ConversationMessage[] {
    const baseHour = 9 + (index % 3);
    const baseMinute = (index * 7) % 60;

    return [
        {
            id: `${index + 1}-m1`,
            actor: 'cliente',
            author: customerName,
            body: seed.baseMessage,
            timestamp: toClock(baseHour, baseMinute),
        },
        {
            id: `${index + 1}-m2`,
            actor: 'ia',
            author: 'Frank',
            body: `Intencao detectada: ${seed.intent}. Sugerir resposta curta com contexto de ${seed.tags[0]} e proxima acao explicita.`,
            timestamp: toClock(baseHour, (baseMinute + 3) % 60),
        },
        {
            id: `${index + 1}-m3`,
            actor: 'humano',
            author: owner,
            body: `Estou alinhando ${seed.intent} com operacao e volto com um status objetivo para nao perder a janela do cliente.`,
            timestamp: toClock(baseHour, (baseMinute + 8) % 60),
            delivery: index % 4 === 0 ? 'lido' : 'enviado',
        },
        {
            id: `${index + 1}-m4`,
            actor: 'cliente',
            author: customerName,
            body: 'Perfeito, fico no aguardo do retorno com a previsao revisada.',
            timestamp: toClock(baseHour, (baseMinute + 13) % 60),
        },
    ];
}

function buildSimulations(index: number, primarySimulationId: string): ConversationSimulation[] {
    return [
        {
            id: primarySimulationId,
            route: index % 2 === 0 ? 'SP > CE' : 'SP > GO',
            carrier: index % 3 === 0 ? 'Jadlog' : index % 3 === 1 ? 'Braspress' : 'Total Express',
            value: `R$ ${(92 + index * 4).toFixed(2).replace('.', ',')}`,
            status: index % 3 === 0 ? 'contingencia' : index % 2 === 0 ? 'aprovada' : 'pendente',
        },
        {
            id: `SIM-${5100 + index}`,
            route: index % 2 === 0 ? 'CE > PE' : 'MG > SP',
            carrier: index % 2 === 0 ? 'Azul Cargo' : 'Latam Cargo',
            value: `R$ ${(118 + index * 3).toFixed(2).replace('.', ',')}`,
            status: index % 4 === 0 ? 'pendente' : 'aprovada',
        },
    ];
}

function buildOrders(index: number, primaryOrderId: string): ConversationOrder[] {
    return [
        {
            id: primaryOrderId,
            stage: index % 2 === 0 ? 'Aprovacao comercial' : 'Coleta programada',
            promise: index % 2 === 0 ? 'Hoje 18:00' : 'Amanha 10:00',
            total: `R$ ${(430 + index * 21).toFixed(2).replace('.', ',')}`,
            status: index % 4 === 0 ? 'aguardando-aprovacao' : index % 3 === 0 ? 'coleta' : 'processando',
        },
        {
            id: `${1720 + index}`,
            stage: 'Tracking ativo',
            promise: 'Entregue no turno',
            total: `R$ ${(280 + index * 11).toFixed(2).replace('.', ',')}`,
            status: 'entregue',
        },
    ];
}

export const mockConversations: ConversationRecord[] = conversationSeeds.map((seed, index) => {
    const client = mockClients[index % mockClients.length];
    const order = mockOrders.find((item) => item.customer.id === client.id) ?? mockOrders[index % mockOrders.length];
    const logistics = mockLogistics.find((item) => item.order.id === order.id) ?? mockLogistics[index % mockLogistics.length];
    const owner = owners[index % owners.length];
    const status = statuses[index % statuses.length];
    const priority = priorities[index % priorities.length];
    const channel = channels[index % channels.length];
    const orderId = order.id;
    const simulationId = logistics.simulations[0]?.id ?? `SIM-${4100 + index}`;

    return {
        id: `conversation-${index + 1}`,
        relatedClientId: client.id,
        relatedLogisticsId: logistics.id,
        customerName: client.company,
        customerSegment: client.segment,
        owner,
        status,
        priority,
        channel,
        lastMessage: seed.baseMessage,
        lastMessageAt:
            index === 0 ? 'Agora' : index === 1 ? '2 min' : index < 6 ? `${index * 4} min` : `${8 + index} min`,
        waitingSince: index < 4 ? `${12 + index * 3} min` : `${1 + (index % 4)}h ${(index * 5) % 60}m`,
        unreadCount: priority === 'critica' ? 3 : priority === 'alta' ? 2 : index % 2,
        relatedOrderId: orderId,
        relatedSimulationId: simulationId,
        messages: buildMessages(seed, client.company, index, owner),
        context: {
            customerSummary: client.summary,
            accountHealth:
                status === 'escalada'
                    ? 'Risco alto de ruptura operacional'
                    : status === 'resolvida'
                      ? 'Estavel apos ultima resolucao'
                      : 'Operacao ativa com necessidade de acompanhamento',
            region: client.city,
            tags: client.tags,
            detectedIntent: seed.intent,
            recentSimulations: buildSimulations(index, simulationId),
            recentOrders: buildOrders(index, orderId),
        },
    };
});
