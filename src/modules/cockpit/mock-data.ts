import { mockLogistics } from '@/modules/logistica/mock-data';
import { mockOrders } from '@/modules/pedidos/mock-data';
import type {
    CockpitActionQueueItem,
    CockpitAlert,
    CockpitEvent,
    CockpitMetric,
    CockpitShortcut,
    SystemStatusItem,
} from './data/shared';

// Static fallback IDs for cockpit dashboard links (conversations are now live from API)
const primaryConversationId = 'inbox';
const primaryClientId = '';
const primaryStatus = 'nova';
const backlogConversationId = 'inbox';
const backlogClientId = '';
const backlogStatus = 'nova';
const waitingConversationId = 'inbox';
const waitingClientId = '';
const waitingCustomerName = '—';

const approvalOrder =
    mockOrders.find((order) => order.status === 'em-analise') ??
    mockOrders[0];
const confirmedOrder =
    mockOrders.find((order) => order.status === 'aprovado') ??
    mockOrders[2] ??
    mockOrders[0];
const simulationRecord =
    mockLogistics.find((item) => item.status === 'simulado') ??
    mockLogistics[0];
const exceptionRecord =
    mockLogistics.find((item) => item.hasException) ??
    mockLogistics[1] ??
    mockLogistics[0];

export const cockpitMetrics: CockpitMetric[] = [
    {
        id: 'active-conversations',
        label: 'Conversas ativas',
        value: '126',
        helper: 'Fila viva entre WhatsApp, reaberturas e atendimento assistido.',
        tone: 'warning',
        href: `/conversas?conversa=${primaryConversationId}&cliente=${primaryClientId}&status=${primaryStatus}`,
    },
    {
        id: 'orders-processing',
        label: 'Pedidos em processamento',
        value: '248',
        helper: 'Pedidos com owner visivel entre aprovacao, preparo e coleta.',
        tone: 'info',
        href: `/pedidos?pedido=${approvalOrder.id}&status=${approvalOrder.status}`,
    },
    {
        id: 'simulations-today',
        label: 'Simulacoes de frete hoje',
        value: '412',
        helper: 'Volume operacional de cotacao com contingencia e margem observadas.',
        tone: 'success',
        href: `/logistica?pedido=${simulationRecord.order.id}&status=${simulationRecord.status}`,
    },
    {
        id: 'exceptions',
        label: 'Erros e excecoes',
        value: '17',
        helper: 'Casos que exigem resposta manual ou revisao de regra.',
        tone: 'critical',
        href: `/logistica?logistica=${exceptionRecord.id}&excecao=true`,
    },
];

export const cockpitAlerts: CockpitAlert[] = [
    {
        id: 'integration-failure',
        title: 'Falha de integracao em webhook de WhatsApp',
        description: 'Eventos estao entrando com retry, mas o backlog operacional ja subiu acima do baseline do turno.',
        priority: 'critical',
        action: 'Verificar integracao',
        href: `/conversas?status=nova&prioridade=critica`,
    },
    {
        id: 'stuck-orders',
        title: 'Pedidos travados em aprovacao comercial',
        description: 'Doze pedidos estao aguardando decisao manual e impactam a promessa de entrega do dia.',
        priority: 'warning',
        action: 'Abrir pedidos',
        href: `/pedidos?pedido=${approvalOrder.id}&status=${approvalOrder.status}`,
    },
    {
        id: 'simulation-error',
        title: 'Erro intermitente em simulacao de frete',
        description: 'Uma transportadora secundaria retornou timeout em regioes remotas e precisa de contingencia.',
        priority: 'warning',
        action: 'Revisar logistica',
        href: `/logistica?logistica=${exceptionRecord.id}&excecao=true&transportadora=${exceptionRecord.carrier}`,
    },
    {
        id: 'conversation-backlog',
        title: 'Backlog alto de conversas sem resposta',
        description: 'Clientes premium reabriram tickets em menos de 15 minutos apos o primeiro contato.',
        priority: 'info',
        action: 'Abrir conversas',
        href: `/conversas?conversa=${backlogConversationId}&cliente=${backlogClientId}&status=${backlogStatus}`,
    },
];

export const cockpitEvents: CockpitEvent[] = [
    {
        id: 'evt-1',
        timestamp: 'Agora',
        type: 'simulacao',
        entity: `Pedido #${simulationRecord.order.id}`,
        title: 'Nova simulacao criada',
        description: 'Cotacao rodada com contingencia secundaria para manter prazo sem romper margem.',
        tone: 'info',
        href: `/logistica?pedido=${simulationRecord.order.id}`,
    },
    {
        id: 'evt-2',
        timestamp: '2 min',
        type: 'mensagem',
        entity: 'Conversa prioritaria',
        title: 'Mensagem recebida',
        description: 'Cliente pediu atualizacao de coleta e aumentou a prioridade da conversa.',
        tone: 'warning',
        href: `/conversas?conversa=${primaryConversationId}&cliente=${primaryClientId}`,
    },
    {
        id: 'evt-3',
        timestamp: '6 min',
        type: 'pedido',
        entity: `Pedido #${confirmedOrder.id}`,
        title: 'Pedido confirmado',
        description: 'Fluxo comercial concluido e handoff para logistica liberado.',
        tone: 'success',
        href: `/pedidos?pedido=${confirmedOrder.id}`,
    },
    {
        id: 'evt-4',
        timestamp: '11 min',
        type: 'webhook',
        entity: 'Canal WhatsApp',
        title: 'Erro de webhook',
        description: 'Recebimento entrou em retry automatico e segue sob observacao.',
        tone: 'critical',
        href: '/conversas?status=nova&prioridade=critica',
    },
    {
        id: 'evt-5',
        timestamp: '18 min',
        type: 'sessao',
        entity: 'Operador CX-07',
        title: 'Nova sessao iniciada',
        description: 'Operador entrou no turno e assumiu fila de reabertura de clientes premium.',
        tone: 'info',
        href: `/conversas?conversa=${waitingConversationId}&cliente=${waitingClientId}`,
    },
];

export const cockpitActionQueue: CockpitActionQueueItem[] = [
    {
        id: 'queue-1',
        queue: 'Conversas sem resposta',
        entity: 'Loja Riacho',
        waitingFor: 'Resposta do operador',
        age: '14 min',
        owner: 'CX Ops',
        priority: 'critical',
        href: `/conversas?conversa=${primaryConversationId}&cliente=${primaryClientId}`,
    },
    {
        id: 'queue-2',
        queue: 'Pedidos aguardando aprovacao',
        entity: `Pedido #${approvalOrder.id}`,
        waitingFor: 'Liberacao comercial',
        age: '46 min',
        owner: 'Sales Ops',
        priority: 'warning',
        href: `/pedidos?pedido=${approvalOrder.id}&status=${approvalOrder.status}`,
    },
    {
        id: 'queue-3',
        queue: 'Simulacoes pendentes',
        entity: `Pedido #${simulationRecord.order.id}`,
        waitingFor: 'Escolha de transportadora',
        age: '9 min',
        owner: 'Freight Ops',
        priority: 'info',
        href: `/logistica?pedido=${simulationRecord.order.id}&status=${simulationRecord.status}`,
    },
    {
        id: 'queue-4',
        queue: 'Conversas sem resposta',
        entity: waitingCustomerName,
        waitingFor: 'Contexto de pedido',
        age: '27 min',
        owner: 'CX Ops',
        priority: 'warning',
        href: `/conversas?conversa=${waitingConversationId}&cliente=${waitingClientId}`,
    },
];

export const cockpitSystemStatus: SystemStatusItem[] = [
    {
        id: 'redis',
        label: 'Redis',
        status: 'healthy',
        detail: 'Fila e cache respondendo dentro da latencia alvo.',
    },
    {
        id: 'db',
        label: 'DB',
        status: 'healthy',
        detail: 'Leituras e gravacoes do turno sem degradacao percebida.',
    },
    {
        id: 'ai-provider',
        label: 'AI Provider',
        status: 'warning',
        detail: 'Fallback pronto; ultima resposta acima do tempo esperado.',
    },
    {
        id: 'webhook',
        label: 'Webhook',
        status: 'critical',
        detail: 'Retries ativos em um canal critico e backlog em crescimento.',
    },
];

export const cockpitShortcuts: CockpitShortcut[] = [
    {
        id: 'new-simulation',
        label: 'Nova simulacao',
        description: 'Abrir o simulador operacional com foco em contingencia e custo.',
        href: `/logistica/simulador?pedido=${simulationRecord.order.id}`,
    },
    {
        id: 'open-conversations',
        label: 'Abrir conversas',
        description: 'Ir direto para a fila omnichannel e reduzir backlog.',
        href: `/conversas?conversa=${backlogConversationId}&cliente=${backlogClientId}&status=${backlogStatus}`,
    },
    {
        id: 'create-order',
        label: 'Criar pedido',
        description: 'Entrar na camada de pedidos e acompanhar o fluxo operacional.',
        href: `/pedidos?pedido=${approvalOrder.id}&status=${approvalOrder.status}`,
    },
    {
        id: 'view-metrics',
        label: 'Ver metricas',
        description: 'Checar leitura executiva sem sair da espinha dorsal nova.',
        href: '/metricas',
    },
];
