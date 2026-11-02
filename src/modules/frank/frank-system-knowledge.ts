/**
 * frank-system-knowledge.ts
 * Deep Operational Knowledge representation of CONDSTORE OS.
 */

export interface SystemDomainKnowledge {
    domain: string;
    description: string;
    routes: string[];
    tables: string[];
    keyServices: string[];
    businessRules: string[];
}

export const CONDSTORE_SYSTEM_KNOWLEDGE: Record<string, SystemDomainKnowledge> = {
    atendimento: {
        domain: 'Atendimento e WhatsApp CRM',
        description: 'Gerenciamento de sessões de conversa do WhatsApp Business, triagem de leads, handoff humano e CRM operacional.',
        routes: ['/conversas', '/api/whatsapp/incoming', '/api/conversas'],
        tables: ['conversations', 'conversation_messages', 'messages', 'customers', 'customer_contacts'],
        keyServices: ['whatsapp-orchestrator.ts', 'crm.service.ts'],
        businessRules: [
            'Mensagens de entrada chegam pelo webhook Twilio em /api/whatsapp/incoming.',
            'O isolamento por tenant é estritamente derivado da credencial do número Twilio ou sessão autenticada.',
            'Ações ativas do Frank em conversas requerem Human Gate quando a flag FRANK_RUNTIME_ENABLED está desativada ou em modo supervisionado.'
        ]
    },
    frete: {
        domain: 'Cotação e Inteligência de Frete',
        description: 'Simulação multicarrier, cálculo de cubagem/embalagem, aplicação de margem e aceite de cotação.',
        routes: ['/cockpit/freight-simulator', '/api/freight/quote', '/api/cockpit/metrics/freight'],
        tables: ['simulations', 'freight_simulations', 'freight_confirmations', 'carrier_policies', 'carrier_rate_rows', 'packing_profiles'],
        keyServices: ['freight.engine.ts', 'packing-calculator.ts'],
        businessRules: [
            'Simulações geram registros de cotação com status DRAFT.',
            'Apenas cotações aceitas (ACCEPTED) podem ser convertidas em pedidos.',
            'Mensagens de cotação formatadas utilizam Intl.NumberFormat pt-BR.'
        ]
    },
    pedidos: {
        domain: 'Gestão de Pedidos (Orders)',
        description: 'Criação, confirmação, controle de status, transição comercial e transição para logística.',
        routes: ['/logistica-pedidos', '/api/pedidos', '/api/atendimento/pedidos'],
        tables: ['orders', 'order_items', 'order_status_history'],
        keyServices: ['order.service.ts'],
        businessRules: [
            'Criação de pedidos exige obrigatoriamente cotação no status ACCEPTED.',
            'Alteração de status do pedido gera histórico de auditoria em order_status_history.'
        ]
    },
    logistica: {
        domain: 'Shipments e Rastreamento Logístico',
        description: 'Emissão e rastreamento de fretes/shipments, despacho e ocorrências.',
        routes: ['/logistica-pedidos', '/api/shipments'],
        tables: ['shipments', 'deliveries', 'delivery_location_events'],
        keyServices: ['shipment.service.ts'],
        businessRules: [
            'Shipment vinculado ao pedido e à transportadora selecionada.',
            'Mudança de status atualiza a linha do tempo operacional e a visão do cliente.'
        ]
    },
    cockpit: {
        domain: 'Cockpit e Métrica Operacional',
        description: 'Painel unificado de operação diária, filas de atenção, timeline e métricas em tempo real/7 dias.',
        routes: ['/cockpit-gerencial', '/cockpit/frank', '/api/cockpit/metrics', '/api/cockpit/queues'],
        tables: ['operational_events', 'metrics_daily', 'ai_decision_logs', 'frank_execution_runs'],
        keyServices: ['cockpit-metrics-engine.ts', 'get-cockpit-queues.ts'],
        businessRules: [
            'Métricas devem refletir dados reais do banco de dados, exibindo fallbacks ("-" ou "sem dados") sem injetar dados simulados.',
            'O Cockpit Workplace Shell centraliza os indicadores de atenção priorizada.'
        ]
    }
};

export function getSystemKnowledgeContext(domainFilter?: string): string {
    if (domainFilter && CONDSTORE_SYSTEM_KNOWLEDGE[domainFilter]) {
        const d = CONDSTORE_SYSTEM_KNOWLEDGE[domainFilter];
        return `Domínio: ${d.domain}\nDescrição: ${d.description}\nRotas: ${d.routes.join(', ')}\nTabelas: ${d.tables.join(', ')}\nRegras: ${d.businessRules.join(' ')}`;
    }

    return Object.values(CONDSTORE_SYSTEM_KNOWLEDGE)
        .map(d => `[${d.domain}] Rotas: ${d.routes.join(', ')} | Tabelas: ${d.tables.join(', ')}`)
        .join('\n');
}
