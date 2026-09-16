export type NodeCategory =
  | 'domain'
  | 'module'
  | 'service'
  | 'component'
  | 'api'
  | 'entity'
  | 'integration'
  | 'infra'
  | 'ai_tool'
  | 'event'
  | 'flow_step';

export type NodeStatus =
  | '🟢 Produção'
  | '🟡 Parcial'
  | '🔵 Implementado'
  | '🟣 Experimental'
  | '⚪ Planejado'
  | '🔴 Fora do Escopo';

export interface ArchNode {
  id: string;
  name: string;
  category: NodeCategory;
  domain: string;
  status: NodeStatus;
  isMvp: boolean;
  path: string;
  directory: string;
  description: string;
  responsibilities: string[];
  dependencies: string[];
  dependents: string[];
  githubUrl: string;
  evidence: string;
  level: 1 | 2 | 3 | 4; // 1: Visão Executiva, 2: Sistema/Módulo, 3: Implementação/Serviço, 4: Código/Detalhe
  parent?: string;
  x?: number;
  y?: number;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  type: 'depends_on' | 'calls' | 'data_flow' | 'event' | 'contains';
  description?: string;
}

export interface ArchFlow {
  id: string;
  name: string;
  description: string;
  nodes: string[];
}

export interface PRDiff {
  id: string;
  title: string;
  prNumber: string;
  before: string;
  after: string;
  didacticSummary: string;
  mergedAt: string;
  impactedNodes: string[];
}

export const ARCHITECTURE_DATA: {
  nodes: ArchNode[];
  edges: ArchEdge[];
  flows: ArchFlow[];
  prDiffs: PRDiff[];
} = {
  prDiffs: [
    {
      id: 'pr-latest-bounded-contexts',
      title: 'Unificação dos Bounded Contexts Canonical de Conversas, Clientes e Pedidos',
      prNumber: 'PR #184',
      before: 'Os módulos de atendimento, conversas, clientes e pedidos estavam espalhados em diretórios duplicados (`src/modules/atendimento`, `src/modules/conversas`, `src/modules/clientes`, `src/modules/pedidos`) com divergências de tipagem.',
      after: 'Unificação total com Bounded Contexts canônicos em `src/modules/conversations/`, `src/modules/customers/`, e `src/modules/orders/`. Os diretórios legados funcionam estritamente como camadas de re-exportação para retrocompatibilidade.',
      didacticSummary: 'Garante integridade de código, isolamento de domínio e elimina duplicidade de regras de negócio entre o Cockpit e as APIs públicas.',
      mergedAt: '2025-02-28',
      impactedNodes: ['conversations-module', 'customers-module', 'orders-module']
    },
    {
      id: 'pr-frank-concurrency',
      title: 'Implementação do FrankConcurrencyScheduler (FRANK-006) e DAG Engine',
      prNumber: 'PR #179',
      before: 'Frank executava chamadas LLM e chamadas de ferramentas de forma síncrona/direta sem controle global de concorrência por tenant ou propagação determinística de cancelamentos.',
      after: 'Adicionado o `FrankConcurrencyScheduler` e `FrankDagEngine`, com limites de concorrência por tenant, fila round-robin, aging anti-starvation e cancelamento por AbortSignal.',
      didacticSummary: 'Evita sobrecarga do gateway LLM, previne starvation entre tenants e garante isolamento total no consumo de IA.',
      mergedAt: '2025-02-20',
      impactedNodes: ['frank-module', 'frank-scheduler', 'frank-dag']
    },
    {
      id: 'pr-cockpit-v2',
      title: 'Decomposição do Cockpit V2 Workspace e Fila Operacional Unificada',
      prNumber: 'PR #165',
      before: 'O workspace do Cockpit era um arquivo monolítico denso e difícil de manter, com dados simulados misturados a dados reais.',
      after: 'Decomposição modular sob `src/modules/cockpit/workspace/components/` (`WorkspaceHeader`, `AttentionStrip`, `WorkQueue`, `WorkItemRow`, `ContextPanel`), com métricas derivadas diretamente do MySQL e fallbacks explícitos.',
      didacticSummary: 'Melhora a performance de renderização do operador, unifica a fila de trabalho (conversas, frete, pedidos, exceções) e reflete a telemetria real do banco.',
      mergedAt: '2025-02-12',
      impactedNodes: ['cockpit-module', 'cockpit-work-queue', 'cockpit-context-panel']
    }
  ],

  flows: [
    {
      id: 'whatsapp-order-flow',
      name: 'Fluxo Operacional Principal: WhatsApp -> Cotação -> Pedido -> Logística',
      description: 'Entrada de mensagem via WhatsApp, processamento por regras/Frank, criação de cotação de frete, aceitação, geração de pedido e criação da expedição no Melhor Envio.',
      nodes: [
        'integration-twilio',
        'whatsapp-webhook-api',
        'conversations-module',
        'frank-module',
        'freight-module',
        'orders-module',
        'fulfillment-module',
        'integration-melhor-envio'
      ]
    },
    {
      id: 'frank-supervision-flow',
      name: 'Fluxo de IA Frank Supervisionado: Sinal -> Diagnóstico -> Human Gate -> Execução',
      description: 'Captura de sinal operacional por evento, disparo do pipeline de diagnóstico do Frank, avaliação de risco no Human Gate Policy, emissão de sugestão no Cockpit e execução com checkpoint.',
      nodes: [
        'operational-event-bus',
        'frank-observer',
        'frank-diagnosis',
        'frank-human-gate',
        'cockpit-module',
        'frank-execution-runtime'
      ]
    },
    {
      id: 'multi-tenant-auth-flow',
      name: 'Fluxo de Segurança e Isolamento Multi-Tenant',
      description: 'Validante de requisição no Middleware, extração de claims JWT, injeção de headers de contexto, execução de rota com Guard de Tenant e filtro automático em queries Drizzle.',
      nodes: [
        'edge-middleware',
        'auth-module',
        'tenant-guard',
        'drizzle-schema',
        'database-mysql'
      ]
    }
  ],

  nodes: [
    // --- NÍVEL 1: ROOT & GRANDES DOMÍNIOS ---
    {
      id: 'condstore-root',
      name: 'CONDSTORE OS',
      category: 'domain',
      domain: 'Core System',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/',
      directory: 'src/',
      description: 'Sistema Operacional para E-Commerce & Operações Logísticas no Brasil ("Da conversa ao caminhão, sem perder o fio").',
      responsibilities: ['Gestão de Atendimento WhatsApp', 'Cotação & Auditoria de Frete', 'Gestão de Pedidos & Logística', 'Co-piloto Supervisionado Frank IA', 'Cockpit Gerencial Multi-Tenant'],
      dependencies: [],
      dependents: ['conversations-module', 'fulfillment-module', 'orders-module', 'cockpit-module', 'frank-module', 'infra-core'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src',
      evidence: 'Root directory src/ e AGENTS.md.',
      level: 1,
      x: 600,
      y: 50
    },
    {
      id: 'conversations-module',
      name: 'Atendimento & Conversas',
      category: 'domain',
      domain: 'Atendimento',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/conversations',
      directory: 'src/modules/conversations/',
      description: 'Bounded Context canônico para gestão de mensagens, sessões de chat, integração WhatsApp Twilio e triagem.',
      responsibilities: ['Inbound & Outbound WhatsApp', 'Atribuição de operadores', 'Métricas de SLA e tempo de resposta', 'Classificação de intenções'],
      dependencies: ['integration-twilio', 'database-mysql', 'operational-event-bus'],
      dependents: ['cockpit-module', 'frank-module', 'orders-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/conversations',
      evidence: 'Canonical bounded context em src/modules/conversations/ index.ts & server.ts.',
      level: 1,
      parent: 'condstore-root',
      x: 150,
      y: 200
    },
    {
      id: 'fulfillment-module',
      name: 'Fulfillment & Logística',
      category: 'domain',
      domain: 'Logística',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/fulfillment',
      directory: 'src/modules/fulfillment/',
      description: 'Bounded Context canônico de logística: cotação de frete, cálculo dimensional, tabelas de frete e expedição.',
      responsibilities: ['Engine de cotação de frete', 'Adapter de transportadoras (Melhor Envio)', 'Gestão de Shipments e rastreamento', 'Auditoria de custos e margem'],
      dependencies: ['integration-melhor-envio', 'database-mysql'],
      dependents: ['orders-module', 'cockpit-module', 'freight-api'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/fulfillment',
      evidence: 'Canonical bounded context em src/modules/fulfillment/.',
      level: 1,
      parent: 'condstore-root',
      x: 420,
      y: 200
    },
    {
      id: 'orders-module',
      name: 'Gestão de Pedidos (Orders)',
      category: 'domain',
      domain: 'Orders',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/orders',
      directory: 'src/modules/orders/',
      description: 'Bounded Context canônico de pedidos: ciclo de vida do pedido, bloqueios de segurança e vínculo com cotação aceita.',
      responsibilities: ['Criação de pedidos a partir de cotação aceita', 'Transição de estados do pedido', 'Emissão de eventos operacionais', 'Rastreabilidade com cliente e conversa'],
      dependencies: ['conversations-module', 'fulfillment-module', 'database-mysql'],
      dependents: ['cockpit-module', 'finops-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/orders',
      evidence: 'Canonical bounded context em src/modules/orders/ com bloqueio de cotação ACCEPTED.',
      level: 1,
      parent: 'condstore-root',
      x: 690,
      y: 200
    },
    {
      id: 'cockpit-module',
      name: 'Cockpit Gerencial V2',
      category: 'domain',
      domain: 'Cockpit',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/cockpit',
      directory: 'src/modules/cockpit/',
      description: 'Painel unificado de controle operacional, inteligência de fila e supervisão do Frank.',
      responsibilities: ['Work Queue categorizada (conversas, frete, pedidos, exceções)', 'Context Panel dinâmico', 'Métricas em tempo real via MySQL', 'Interface do operador'],
      dependencies: ['conversations-module', 'orders-module', 'fulfillment-module', 'frank-module'],
      dependents: ['app-routes-cockpit'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/cockpit',
      evidence: 'Decomposição do Cockpit V2 em src/modules/cockpit/workspace/.',
      level: 1,
      parent: 'condstore-root',
      x: 960,
      y: 200
    },
    {
      id: 'frank-module',
      name: 'IA Frank Supervisionado',
      category: 'domain',
      domain: 'IA Frank',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/frank',
      directory: 'src/modules/frank/',
      description: 'Arquitetura de co-piloto de IA com runtime seguro, Human Gate Policy, Scheduler concorrente e DAG Engine.',
      responsibilities: ['Diagnóstico de exceções e anomalias', 'Geração de sugestões com Human Gate', 'Execução de ferramentas isoladas por tenant', 'Engineering Mode e conhecimento do sistema'],
      dependencies: ['llm-gateway', 'frank-scheduler', 'frank-human-gate', 'database-mysql'],
      dependents: ['cockpit-module', 'whatsapp-webhook-api'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/frank',
      evidence: 'Módulo Frank Supremo em src/modules/frank/ com 15 ferramentas e DAG Engine.',
      level: 1,
      parent: 'condstore-root',
      x: 1230,
      y: 200
    },

    // --- NÍVEL 2: MÓDULOS E SERVIÇOS DO SISTEMA ---
    {
      id: 'customers-module',
      name: 'Gestão de Clientes & Contatos',
      category: 'module',
      domain: 'Clientes',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/customers',
      directory: 'src/modules/customers/',
      description: 'Resolução de identidade do cliente, contatos, mascaramento PII, hash de telefone e vínculo CNPJ.',
      responsibilities: ['GetCustomerWithContext', 'Hash determinístico de telefone', 'Validação de CNPJ/CPF', 'Vínculo com conversas e pedidos'],
      dependencies: ['database-mysql', 'pii-crypto'],
      dependents: ['conversations-module', 'orders-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/customers',
      evidence: 'Canonical bounded context em src/modules/customers/.',
      level: 2,
      parent: 'conversations-module',
      x: 100,
      y: 350
    },
    {
      id: 'frank-scheduler',
      name: 'Frank Concurrency Scheduler',
      category: 'service',
      domain: 'IA Frank',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/frank/concurrency/frank-concurrency-scheduler.ts',
      directory: 'src/modules/frank/concurrency/',
      description: 'Gerenciador de concorrência global e per-tenant com fila round-robin, aging e suporte a AbortSignal.',
      responsibilities: ['Limitação de chamadas simultâneas', 'Isolamento por tenant na fila', 'Cancelamento por AbortSignal', 'Prevenção de starvation com priority aging'],
      dependencies: [],
      dependents: ['frank-execution-runtime', 'frank-dag'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/frank/concurrency/frank-concurrency-scheduler.ts',
      evidence: 'FRANK-006 em src/modules/frank/concurrency/frank-concurrency-scheduler.ts.',
      level: 2,
      parent: 'frank-module',
      x: 1150,
      y: 350
    },
    {
      id: 'frank-dag',
      name: 'Frank Dependency-aware Task DAG',
      category: 'service',
      domain: 'IA Frank',
      status: '🟢 Produção',
      isMvp: false,
      path: 'src/modules/frank/dag/frank-dag-engine.ts',
      directory: 'src/modules/frank/dag/',
      description: 'Engine de execução de tarefas baseada em grafos acíclicos dirigidos (DAG) com validação por algoritmo de Kahn.',
      responsibilities: ['Validação de DAG sem ciclos', 'Execução paralela de nós READY', 'Propagação de falhas e cancelamentos', 'Snapshots e auditoria de plano'],
      dependencies: ['frank-scheduler'],
      dependents: ['frank-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/frank/dag',
      evidence: 'FRANK-007 em src/modules/frank/dag/.',
      level: 2,
      parent: 'frank-module',
      x: 1300,
      y: 350
    },
    {
      id: 'frank-human-gate',
      name: 'Frank Human Gate Policy Engine',
      category: 'service',
      domain: 'IA Frank',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/frank/frank-human-gate-policy.ts',
      directory: 'src/modules/frank/',
      description: 'Motor de políticas para interceptar e exigir aprovação humana antes de ações de risco.',
      responsibilities: ['Classificação de risco de ferramentas', 'Bloqueio de ações destrutivas sem aprovação', 'Geração de justificativa técnica e impacto'],
      dependencies: [],
      dependents: ['frank-execution-runtime', 'cockpit-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/frank/frank-human-gate-policy.ts',
      evidence: 'Classificação de risco e Human Gate em src/modules/frank/frank-human-gate-policy.ts.',
      level: 2,
      parent: 'frank-module',
      x: 1450,
      y: 350
    },
    {
      id: 'domine-event-bus',
      name: 'DOMINE Event Bus & DLQ',
      category: 'service',
      domain: 'Infrastructure',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/domine/event-bus.service.ts',
      directory: 'src/modules/domine/',
      description: 'Barramento de eventos com chave de idempotência, retries assíncronos e Dead Letter Queue (DLQ).',
      responsibilities: ['Publicação idempotente de eventos', 'Processamento assíncrono com retries', 'Roteamento para DLQ em falhas persistentes'],
      dependencies: ['database-mysql'],
      dependents: ['orders-module', 'fulfillment-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/domine',
      evidence: 'Serviço DOMINE em src/modules/domine/event-bus.service.ts.',
      level: 2,
      parent: 'infra-core',
      x: 750,
      y: 350
    },

    // --- NÍVEL 3: APIS, SCHEMAS E BANCO DE DADOS ---
    {
      id: 'whatsapp-webhook-api',
      name: 'POST /api/whatsapp/incoming',
      category: 'api',
      domain: 'Atendimento',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/app/api/whatsapp/incoming/route.ts',
      directory: 'src/app/api/whatsapp/incoming/',
      description: 'Endpoint de webhook que recebe e processa eventos e mensagens do Twilio WhatsApp com validação de assinatura HMAC.',
      responsibilities: ['Validação de HMAC X-Twilio-Signature', 'Resolução de tenant pelo número', 'Orquestração do atendimento inbound'],
      dependencies: ['integration-twilio', 'conversations-module'],
      dependents: ['cockpit-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/app/api/whatsapp/incoming/route.ts',
      evidence: 'Endpoint real com validação de Twilio em src/app/api/whatsapp/incoming/route.ts.',
      level: 3,
      parent: 'conversations-module',
      x: 150,
      y: 500
    },
    {
      id: 'freight-api',
      name: 'POST /api/freight/simulate',
      category: 'api',
      domain: 'Logística',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/app/api/freight/simulate/route.ts',
      directory: 'src/app/api/freight/simulate/',
      description: 'API de simulação e cotação de frete em tempo real conectada ao Melhor Envio e tabelas próprias.',
      responsibilities: ['Cotação de prazos e valores de frete', 'Persistência de simulação no MySQL', 'Cálculo de margem e regras de embalagem'],
      dependencies: ['fulfillment-module', 'database-mysql'],
      dependents: ['orders-module', 'public-quote-page'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/app/api/freight/simulate/route.ts',
      evidence: 'Endpoint em src/app/api/freight/simulate/route.ts.',
      level: 3,
      parent: 'fulfillment-module',
      x: 420,
      y: 500
    },
    {
      id: 'drizzle-schema',
      name: 'Drizzle MySQL Schema',
      category: 'entity',
      domain: 'Database',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/drizzle/schema.ts',
      directory: 'src/drizzle/',
      description: 'Definição ORM de todas as tabelas relacionais do MySQL com escopo obrigatório de `tenant_id`.',
      responsibilities: ['Mapeamento de entidades (users, tenants, conversations, orders, shipments, frank_*)', 'Invariantes de chave primária e índices', 'Suporte a Soft-Delete'],
      dependencies: ['database-mysql'],
      dependents: ['conversations-module', 'orders-module', 'fulfillment-module', 'frank-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/drizzle/schema.ts',
      evidence: 'Drizzle schema central em src/drizzle/schema.ts.',
      level: 3,
      parent: 'infra-core',
      x: 690,
      y: 500
    },
    {
      id: 'llm-gateway',
      name: 'LLM Central Gateway',
      category: 'service',
      domain: 'IA Frank',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/core/ai/llm-gateway.ts',
      directory: 'src/core/ai/',
      description: 'Gateway unificado de comunicação com LLMs (OpenAI e compatíveis) com redação de PII e prompt guard.',
      responsibilities: ['Redação automática de dados sensíveis PII', 'Mapeamento de modelo e fallback', 'Controle de custos/tokens', 'Prompt injection defense'],
      dependencies: ['pii-crypto', 'integration-openai'],
      dependents: ['frank-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/core/ai/llm-gateway.ts',
      evidence: 'Gateway unificado em src/core/ai/llm-gateway.ts.',
      level: 3,
      parent: 'frank-module',
      x: 1230,
      y: 500
    },

    // --- NÍVEL 4: INFRAESTRUTURA & INTEGRAÇÕES EXTERNAS ---
    {
      id: 'edge-middleware',
      name: 'Next.js Edge Middleware Security',
      category: 'infra',
      domain: 'Infrastructure',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/middleware.ts',
      directory: 'src/',
      description: 'Edge Guard que intercepta todas as requisições, valida JWT de sessão, remove headers falsificados e injeta contexto multi-tenant.',
      responsibilities: ['Validação de sessão JWT na Edge', 'Prevenção de spoofing de header (x-auth-tenant-id)', 'Redirecionamento de rotas protegidas', 'Rate limiting na borda'],
      dependencies: ['auth-module'],
      dependents: ['app-routes-cockpit', 'whatsapp-webhook-api'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/middleware.ts',
      evidence: 'Middleware central em src/middleware.ts.',
      level: 4,
      parent: 'infra-core',
      x: 50,
      y: 650
    },
    {
      id: 'database-mysql',
      name: 'MySQL Database (PlanetScale / MySQL 8)',
      category: 'infra',
      domain: 'Database',
      status: '🟢 Produção',
      isMvp: true,
      path: 'infra/mysql',
      directory: 'infra/',
      description: 'Banco de dados relacional primário para persistência de transações, entidades e eventos operacionais com multi-tenancy.',
      responsibilities: ['Armazenamento transacional', 'Isolamento lógico de dados por tenant', 'Execução de migrations com Drizzle Kit'],
      dependencies: [],
      dependents: ['drizzle-schema'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/drizzle',
      evidence: 'Driver mysql2 em package.json e drizzle/schema.ts.',
      level: 4,
      parent: 'infra-core',
      x: 300,
      y: 650
    },
    {
      id: 'integration-twilio',
      name: 'Integração Twilio WhatsApp API',
      category: 'integration',
      domain: 'Integrations',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/server/twilio',
      directory: 'src/server/twilio/',
      description: 'Conector para envio e recebimento de mensagens WhatsApp via API oficial do Twilio.',
      responsibilities: ['Envio de mensagens outbound', 'Validação de webhook inbound', 'Gestão de mídia e templates'],
      dependencies: [],
      dependents: ['conversations-module', 'whatsapp-webhook-api'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/server/twilio',
      evidence: 'SDK Twilio e handlers em src/server/twilio.',
      level: 4,
      parent: 'conversations-module',
      x: 550,
      y: 650
    },
    {
      id: 'integration-melhor-envio',
      name: 'Integração Melhor Envio SDK/API',
      category: 'integration',
      domain: 'Integrations',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/fulfillment/freight/adapters/melhor-envio.ts',
      directory: 'src/modules/fulfillment/freight/adapters/',
      description: 'Adapter de integração com a API do Melhor Envio para cotação em múltiplas transportadoras (JADLOG, LATAM, Azul, Correios) e compra de frete.',
      responsibilities: ['Cotação de frete multi-carrier', 'Geração de etiquetas de envio', 'Rastreamento de envios'],
      dependencies: [],
      dependents: ['fulfillment-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/fulfillment/freight/adapters/melhor-envio.ts',
      evidence: 'Adapter em src/modules/fulfillment/freight/adapters/melhor-envio.ts.',
      level: 4,
      parent: 'fulfillment-module',
      x: 800,
      y: 650
    },
    {
      id: 'integration-stripe',
      name: 'Integração Stripe Billing',
      category: 'integration',
      domain: 'Integrations',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/modules/billing',
      directory: 'src/modules/billing/',
      description: 'Integração de pagamentos SaaS, assinaturas de tenants e webhooks do Stripe.',
      responsibilities: ['Checkout sessions', 'Gestão de assinaturas e planos', 'Webhook listener com Circuit Breaker'],
      dependencies: [],
      dependents: ['finops-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/billing',
      evidence: 'SDK Stripe e webhook em src/app/api/webhook/stripe/route.ts.',
      level: 4,
      parent: 'infra-core',
      x: 1050,
      y: 650
    },
    {
      id: 'integration-qdrant',
      name: 'Qdrant Vector Database (RAG / Memória Frank)',
      category: 'integration',
      domain: 'IA Frank',
      status: '🟡 Parcial',
      isMvp: false,
      path: 'src/modules/knowledge',
      directory: 'src/modules/knowledge/',
      description: 'Banco de dados vetorial para busca semântica, base de conhecimento e recuperação contextual para o Frank.',
      responsibilities: ['Indexação vetorial de documentos', 'Busca semântica de regras de embalagem e manuais', 'Memória contextual estendida'],
      dependencies: [],
      dependents: ['frank-module'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/modules/knowledge',
      evidence: 'docker-compose.qdrant.yml e src/modules/knowledge/.',
      level: 4,
      parent: 'frank-module',
      x: 1300,
      y: 650
    },
    {
      id: 'infra-core',
      name: 'Núcleo Transversal de Infraestrutura',
      category: 'infra',
      domain: 'Infrastructure',
      status: '🟢 Produção',
      isMvp: true,
      path: 'src/infra',
      directory: 'src/infra/',
      description: 'Serviços transversais: autenticação, criptografia de PII, logging estruturado JSON, rate limiter e observabilidade Sentry.',
      responsibilities: ['Auth JWT', 'Logger JSON estruturado com sanitização', 'Crypto PII AES-256', 'Request Trace ID'],
      dependencies: [],
      dependents: ['condstore-root'],
      githubUrl: 'https://github.com/condstore/condstore-os/tree/main/src/infra',
      evidence: 'Arquivos em src/infra/ e ARCHITECTURE.md.',
      level: 2,
      parent: 'condstore-root',
      x: 600,
      y: 350
    }
  ],

  edges: [
    // Relações entre domínios principais
    { id: 'e1', source: 'condstore-root', target: 'conversations-module', type: 'contains', description: 'Contém o domínio de Atendimento' },
    { id: 'e2', source: 'condstore-root', target: 'fulfillment-module', type: 'contains', description: 'Contém o domínio de Logística' },
    { id: 'e3', source: 'condstore-root', target: 'orders-module', type: 'contains', description: 'Contém o domínio de Pedidos' },
    { id: 'e4', source: 'condstore-root', target: 'cockpit-module', type: 'contains', description: 'Contém o Cockpit' },
    { id: 'e5', source: 'condstore-root', target: 'frank-module', type: 'contains', description: 'Contém a IA Frank' },
    { id: 'e6', source: 'condstore-root', target: 'infra-core', type: 'contains', description: 'Contém a Infraestrutura' },

    // Relações do fluxo WhatsApp -> Cotação -> Pedido -> Logística
    { id: 'e-wa-tw', source: 'whatsapp-webhook-api', target: 'integration-twilio', type: 'calls', description: 'Recebe webhooks assinados do Twilio' },
    { id: 'e-wa-conv', source: 'whatsapp-webhook-api', target: 'conversations-module', type: 'data_flow', description: 'Persiste e atualiza sessão de conversa' },
    { id: 'e-conv-cust', source: 'conversations-module', target: 'customers-module', type: 'depends_on', description: 'Resolve cliente por telefone' },
    { id: 'e-conv-frk', source: 'conversations-module', target: 'frank-module', type: 'calls', description: 'Solicita sugestão ou análise de intenção ao Frank' },
    { id: 'e-frk-lgw', source: 'frank-module', target: 'llm-gateway', type: 'calls', description: 'Executa prompts via Gateway seguro com PII redaction' },
    { id: 'e-conv-frt', source: 'conversations-module', target: 'freight-api', type: 'calls', description: 'Gera cotação de frete para o cliente' },
    { id: 'e-frt-ful', source: 'freight-api', target: 'fulfillment-module', type: 'depends_on', description: 'Chama engine de cálculo de frete' },
    { id: 'e-ful-mel', source: 'fulfillment-module', target: 'integration-melhor-envio', type: 'calls', description: 'Consulta APIs externas do Melhor Envio' },
    { id: 'e-ord-frt', source: 'orders-module', target: 'freight-api', type: 'depends_on', description: 'Exige cotação aceita para gerar pedido' },
    { id: 'e-ord-ful', source: 'orders-module', target: 'fulfillment-module', type: 'data_flow', description: 'Cria shipment correspondente no fulfillment' },
    { id: 'e-cockpit-conv', source: 'cockpit-module', target: 'conversations-module', type: 'data_flow', description: 'Exibe fila de conversas pendentes' },
    { id: 'e-cockpit-ord', source: 'cockpit-module', target: 'orders-module', type: 'data_flow', description: 'Exibe pedidos e pendências de faturamento' },
    { id: 'e-cockpit-frk', source: 'cockpit-module', target: 'frank-module', type: 'data_flow', description: 'Exibe cartões de sugestão do Human Gate' },

    // Relações do Frank Scheduler & DAG
    { id: 'e-frk-sch', source: 'frank-module', target: 'frank-scheduler', type: 'contains', description: 'Controla concorrência via Scheduler' },
    { id: 'e-frk-dag', source: 'frank-module', target: 'frank-dag', type: 'contains', description: 'Valida e executa planos de tarefa DAG' },
    { id: 'e-frk-hg', source: 'frank-module', target: 'frank-human-gate', type: 'depends_on', description: 'Valida políticas de aprovação humana' },
    { id: 'e-frk-qdr', source: 'frank-module', target: 'integration-qdrant', type: 'calls', description: 'Recupera documentos via RAG' },

    // Relações de Infra, BD e Middleware
    { id: 'e-mid-auth', source: 'edge-middleware', target: 'infra-core', type: 'depends_on', description: 'Verifica assinatura JWT e claims de tenant' },
    { id: 'e-sch-db', source: 'drizzle-schema', target: 'database-mysql', type: 'contains', description: 'Define tabelas no MySQL' },
    { id: 'e-dom-db', source: 'domine-event-bus', target: 'database-mysql', type: 'data_flow', description: 'Persiste eventos e fila DLQ no MySQL' }
  ]
};
