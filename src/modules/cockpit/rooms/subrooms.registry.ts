export interface SubRoomDef {
    id: string;
    roomId: string;
    label: string;
    description: string;
    route: string;
    actionLabel?: string;
}

export const subrooms: SubRoomDef[] = [
    // Operação
    { id: 'inbox', roomId: 'operacao', label: 'Inbox', description: 'Central de atendimento e recepção de demandas', route: '/cockpit/atendimento', actionLabel: 'Acessar Inbox' },
    { id: 'conversas', roomId: 'operacao', label: 'Conversas', description: 'Histórico de conversas com clientes', route: '/cockpit/conversas', actionLabel: 'Ver Histórico' },
    { id: 'timeline', roomId: 'operacao', label: 'Timeline', description: 'Eventos operacionais em tempo real', route: '/cockpit/timeline', actionLabel: 'Ver Eventos' },

    // Comercial
    { id: 'pipeline', roomId: 'comercial', label: 'Pipeline', description: 'Gestão de oportunidades e negociações', route: '/cockpit/pipeline', actionLabel: 'Abrir Pipeline' },
    { id: 'cotacoes', roomId: 'comercial', label: 'Cotações', description: 'Simulações e propostas logísticas', route: '/cockpit/cotacoes', actionLabel: 'Ver Cotações' },
    { id: 'conversoes-comercial', roomId: 'comercial', label: 'Conversões', description: 'Taxas de conversão do time comercial', route: '/cockpit/conversoes', actionLabel: 'Analisar Conversões' },

    // Pedidos
    { id: 'orders-kanban', roomId: 'pedidos', label: 'Pedidos Kanban', description: 'Mesa de controle e acompanhamento de envios', route: '/cockpit/orders', actionLabel: 'Acessar Kanban' },
    { id: 'pedidos-detalhe', roomId: 'pedidos', label: 'Painel de Pedidos', description: 'Visão de todos os pedidos efetuados', route: '/cockpit/pedidos', actionLabel: 'Ver Todos' },

    // Logística
    { id: 'shipments', roomId: 'logistica', label: 'Shipments', description: 'Acompanhamento de envios logísticos', route: '/cockpit/orders?tab=shipments', actionLabel: 'Ver Shipments' },
    { id: 'rastreamento', roomId: 'logistica', label: 'Rastreamento', description: 'Status de rastreio de pacotes', route: '/cockpit/logistica/rastreamento', actionLabel: 'Rastrear' },

    // MVP freeze: preservar estes atalhos apenas como fronteira de compatibilidade; não ampliar Frank sem opt-in explícito.
    { id: 'playbooks', roomId: 'frank', label: 'Playbooks', description: 'Construa fluxos e réguas de negociação ativas', route: '/cockpit/frank/playbooks', actionLabel: 'Configurar' },
    { id: 'knowledge', roomId: 'frank', label: 'Knowledge Base', description: 'Injetar pdfs e treinar inteligência primária', route: '/cockpit/frank/knowledge', actionLabel: 'Treinar Base' },
    { id: 'sugestoes', roomId: 'frank', label: 'Sugestões', description: 'Supervisão de respostas em modo guiado', route: '/cockpit/frank/suggestions', actionLabel: 'Revisar Sugestões' },
    { id: 'intents', roomId: 'frank', label: 'Treinamento de Intents', description: 'Treine a intenção a partir de conversas', route: '/cockpit/frank/intents', actionLabel: 'Validar Intents' },
    { id: 'frank-metricas', roomId: 'frank', label: 'Métricas Frank', description: 'Insights operacionais do assessor de AI', route: '/cockpit/frank', actionLabel: 'Ver Métricas' },

    // Inteligência
    { id: 'inteligencia-metricas', roomId: 'inteligencia', label: 'Dashboard', description: 'Métricas globais da operação e faturamento', route: '/cockpit/metricas', actionLabel: 'Ver Dashboard' },
    { id: 'performance', roomId: 'inteligencia', label: 'Performance', description: 'Tempo médio de resolução', route: '/cockpit/performance', actionLabel: 'Analisar Tempo' },
    { id: 'conversoes-intel', roomId: 'inteligencia', label: 'Afunilamento Gráfico', description: 'Evolução e KPIs de aquisição/conversão', route: '/cockpit/conversoes', actionLabel: 'Ver Gráficos' },

    // Governança
    { id: 'logs', roomId: 'governanca', label: 'Logs do Sistema', description: 'Auditoria térmica e tracing de requisições', route: '/sistema/logs', actionLabel: 'Auditar Logs' },
    { id: 'auditoria', roomId: 'governanca', label: 'Auditoria', description: 'Rastreio de autorizações por tenant-id', route: '/sistema/security', actionLabel: 'Abrir Painel' },
    { id: 'eventos', roomId: 'governanca', label: 'Eventos', description: 'Falhas e reprocessamento DLQ', route: '/sistema/dlq', actionLabel: 'Ver Dead Letter' },

    // Configurações
    { id: 'pipeline', roomId: 'configuracoes', label: 'Pipeline de Vendas', description: 'Configurar estágios do CRM', route: '/cockpit/configuracoes/pipeline', actionLabel: 'Configurar' },
    { id: 'transportadoras', roomId: 'configuracoes', label: 'Transportadoras', description: 'Gestão de fretes logísticos', route: '/cockpit/configuracoes/transportadoras', actionLabel: 'Configurar' },
    { id: 'frete', roomId: 'configuracoes', label: 'Regras de Frete', description: 'Gatilhos logísticos avançados', route: '/cockpit/configuracoes/frete', actionLabel: 'Configurar' },
    { id: 'playbooks', roomId: 'configuracoes', label: 'Playbooks', description: 'Atalhos e automações de atendimento', route: '/cockpit/configuracoes/playbooks', actionLabel: 'Configurar' },
    { id: 'templates', roomId: 'configuracoes', label: 'Templates', description: 'Modelos de mensagens e respostas', route: '/cockpit/configuracoes/templates', actionLabel: 'Configurar' },
    { id: 'campos', roomId: 'configuracoes', label: 'Campos Customizáveis', description: 'Crie e edite campos dinâmicos', route: '/cockpit/configuracoes/campos', actionLabel: 'Configurar' },
    { id: 'usuarios', roomId: 'configuracoes', label: 'Usuários', description: 'Gerenciamento de operadores e papéis', route: '/cockpit/usuarios', actionLabel: 'Gerenciar Acessos' },
    { id: 'canais', roomId: 'configuracoes', label: 'Canais Integrados', description: 'Conexões de marketplaces e mensageiros', route: '/cockpit/canais', actionLabel: 'Configurar' },
];
