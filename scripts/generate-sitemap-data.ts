import fs from 'fs';
import path from 'path';

const APP_DIR = path.join(process.cwd(), 'src', 'app');
const REGISTRY_FILE = path.join(process.cwd(), 'docs', 'routes-registry.md');
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'ui', 'sitemap', 'architecture-data.ts');
const GITHUB_BASE_URL = 'https://github.com/catcaio/projeto-condstore/tree/main';

interface RouteEntry {
    path: string;
    method: string;
    access: string;
    auth: string;
    domain: string;
    status: string;
    description: string;
}

interface DiscoveredRoute {
    urlPath: string;
    filePath: string;
    routeType: 'page' | 'api';
    isPublicGroup: boolean;
    isAppGroup: boolean;
}

// 1. Existing Core Architectural Nodes (29 canonical nodes)
const CORE_NODES = [
    {
        id: 'condstore-root',
        name: 'CONDSTORE OS',
        category: 'domain',
        domain: 'Core System',
        layer: 'Domain',
        status: 'production',
        isMvp: true,
        path: 'src/',
        directory: 'src/',
        description: 'Sistema Operacional para E-Commerce & Operações Logísticas no Brasil ("Da conversa ao caminhão, sem perder o fio").',
        responsibilities: [
            'Gestão de Atendimento WhatsApp',
            'Cotação & Auditoria de Frete',
            'Gestão de Pedidos & Logística',
            'Co-piloto Supervisionado Frank IA',
            'Cockpit Gerencial Multi-Tenant'
        ],
        dependencies: [],
        dependents: ['conversations-module', 'fulfillment-module', 'orders-module', 'cockpit-module', 'frank-module', 'infra-core', 'customers-module'],
        technologies: ['Next.js 16', 'TypeScript', 'Tailwind CSS', 'Drizzle ORM', 'MySQL'],
        relatedFiles: ['AGENTS.md', 'README.md', 'docs/mvp-freeze-plan.md'],
        githubUrl: `${GITHUB_BASE_URL}/src`,
        evidence: 'Root directory src/ e diretivas em AGENTS.md.',
        level: 1,
        children: ['conversations-module', 'fulfillment-module', 'orders-module', 'cockpit-module', 'frank-module', 'customers-module', 'infra-core'],
        x: 1200,
        y: 40
    },
    {
        id: 'conversations-module',
        name: 'Atendimento & Conversas',
        category: 'domain',
        domain: 'Atendimento',
        layer: 'Domain',
        status: 'production',
        isMvp: true,
        path: 'src/modules/conversations',
        directory: 'src/modules/conversations/',
        description: 'Bounded Context canônico para gestão de mensagens, sessões de chat, integração WhatsApp Twilio e triagem de atendimento.',
        responsibilities: [
            'Inbound & Outbound WhatsApp',
            'Atribuição de operadores e transferência',
            'Métricas de SLA e tempo de primeira resposta',
            'Classificação de intenções e histórico unificado'
        ],
        dependencies: ['condstore-root', 'integration-twilio', 'database-mysql', 'domine-event-bus'],
        dependents: ['cockpit-module', 'frank-module', 'orders-module'],
        technologies: ['TypeScript', 'Drizzle ORM', 'Twilio SDK', 'Zod'],
        relatedFiles: ['src/modules/conversations/index.ts', 'src/modules/conversations/server.ts', 'src/modules/conversations/presentation/use-conversations.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/conversations`,
        evidence: 'Canonical bounded context em src/modules/conversations/ index.ts & server.ts.',
        level: 1,
        parent: 'condstore-root',
        children: ['whatsapp-webhook-api'],
        x: 100,
        y: 250
    },
    {
        id: 'fulfillment-module',
        name: 'Fulfillment & Logística',
        category: 'domain',
        domain: 'Logística',
        layer: 'Domain',
        status: 'production',
        isMvp: true,
        path: 'src/modules/fulfillment',
        directory: 'src/modules/fulfillment/',
        description: 'Bounded Context canônico de logística: cotação de frete, cálculo dimensional, tabelas de frete e expedição.',
        responsibilities: [
            'Engine de cotação de frete multi-carrier',
            'Adapter de transportadoras (Melhor Envio)',
            'Gestão de Shipments e rastreamento de pacotes',
            'Auditoria de custos e calculador de margem'
        ],
        dependencies: ['condstore-root', 'integration-melhor-envio', 'database-mysql'],
        dependents: ['orders-module', 'cockpit-module', 'freight-api'],
        technologies: ['TypeScript', 'Drizzle ORM', 'Melhor Envio SDK'],
        relatedFiles: ['src/modules/fulfillment/index.ts', 'src/modules/fulfillment/freight/adapters/melhor-envio.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/fulfillment`,
        evidence: 'Canonical bounded context em src/modules/fulfillment/.',
        level: 1,
        parent: 'condstore-root',
        children: ['freight-api', 'integration-melhor-envio'],
        x: 950,
        y: 250
    },
    {
        id: 'orders-module',
        name: 'Gestão de Pedidos (Orders)',
        category: 'domain',
        domain: 'Orders',
        layer: 'Domain',
        status: 'production',
        isMvp: true,
        path: 'src/modules/orders',
        directory: 'src/modules/orders/',
        description: 'Bounded Context canônico de pedidos: ciclo de vida do pedido, bloqueios de segurança e vínculo obrigatório com cotação aceita.',
        responsibilities: [
            'Criação de pedidos a partir de cotação com status ACCEPTED',
            'Transição de estados do pedido e ciclo de vida',
            'Emissão de eventos operacionais de pedido',
            'Rastreabilidade com cliente e conversa de origem'
        ],
        dependencies: ['condstore-root', 'conversations-module', 'fulfillment-module', 'database-mysql'],
        dependents: ['cockpit-module', 'finops-module'],
        technologies: ['TypeScript', 'Drizzle ORM', 'Zod'],
        relatedFiles: ['src/modules/orders/index.ts', 'src/modules/orders/server.ts', 'src/modules/orders/order.service.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/orders`,
        evidence: 'Canonical bounded context em src/modules/orders/ com bloqueio de cotação ACCEPTED em order.service.ts.',
        level: 1,
        parent: 'condstore-root',
        children: [],
        x: 1800,
        y: 250
    },
    {
        id: 'cockpit-module',
        name: 'Cockpit Gerencial V2',
        category: 'domain',
        domain: 'Cockpit',
        layer: 'UI',
        status: 'production',
        isMvp: true,
        path: 'src/modules/cockpit',
        directory: 'src/modules/cockpit/',
        description: 'Painel unificado de controle operacional, inteligência de fila e supervisão do Frank.',
        responsibilities: [
            'Work Queue categorizada (conversas, frete, pedidos, exceções)',
            'Context Panel dinâmico para item selecionado',
            'Métricas em tempo real via MySQL sem dados simulados',
            'Interface do operador e cockpit action queue'
        ],
        dependencies: ['condstore-root', 'conversations-module', 'orders-module', 'fulfillment-module', 'frank-module'],
        dependents: [],
        technologies: ['React 19', 'Next.js App Router', 'Tailwind CSS', 'Lucide Icons'],
        relatedFiles: ['src/modules/cockpit/workspace/components/WorkQueue.tsx', 'src/modules/cockpit/workspace/components/ContextPanel.tsx', 'COCKPIT_AUDIT_REPORT.md'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/cockpit`,
        evidence: 'Decomposição do Cockpit V2 em src/modules/cockpit/workspace/.',
        level: 1,
        parent: 'condstore-root',
        children: ['cockpit-work-queue', 'cockpit-context-panel'],
        x: 2650,
        y: 250
    },
    {
        id: 'frank-module',
        name: 'IA Frank Supervisionado',
        category: 'domain',
        domain: 'IA Frank',
        layer: 'Domain',
        status: 'production',
        isMvp: true,
        path: 'src/modules/frank',
        directory: 'src/modules/frank/',
        description: 'Arquitetura de co-piloto de IA com runtime seguro, Human Gate Policy, Scheduler concorrente, DAG Engine e modo de Engenharia.',
        responsibilities: [
            'Diagnóstico de exceções e anomalias em tempo real',
            'Geração de sugestões com Human Gate Policy',
            'Execução de 15 ferramentas isoladas por tenant',
            'Engineering Mode e base de conhecimento do sistema'
        ],
        dependencies: ['condstore-root', 'llm-gateway', 'frank-scheduler', 'frank-human-gate', 'database-mysql'],
        dependents: ['cockpit-module', 'whatsapp-webhook-api'],
        technologies: ['TypeScript', 'Zod', 'Drizzle ORM', 'OpenAI SDK'],
        relatedFiles: ['src/modules/frank/frank-execution-runtime.ts', 'src/modules/frank/frank-human-gate-policy.ts', 'src/modules/frank/tools/frank-tool.registry.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/frank`,
        evidence: 'Módulo Frank Supremo em src/modules/frank/ com 15 ferramentas registradas em FrankToolRegistry.',
        level: 1,
        parent: 'condstore-root',
        children: ['frank-scheduler', 'frank-dag', 'frank-human-gate', 'frank-execution-runtime', 'frank-observer', 'frank-diagnosis'],
        x: 3500,
        y: 250
    },
    {
        id: 'customers-module',
        name: 'Gestão de Clientes & Contatos',
        category: 'module',
        domain: 'Clientes',
        layer: 'Domain',
        status: 'production',
        isMvp: true,
        path: 'src/modules/customers',
        directory: 'src/modules/customers/',
        description: 'Bounded Context canônico para resolução de identidade do cliente, contatos, mascaramento PII, hash de telefone e vínculo CNPJ.',
        responsibilities: [
            'Lookup de contexto via getCustomerWithContext',
            'Hash determinístico de telefone para privacidade',
            'Validação e formatação de CNPJ/CPF',
            'Vínculo de cliente com conversas e pedidos'
        ],
        dependencies: ['condstore-root', 'database-mysql', 'infra-core'],
        dependents: ['conversations-module', 'orders-module'],
        technologies: ['TypeScript', 'Drizzle ORM', 'Crypto'],
        relatedFiles: ['src/modules/customers/index.ts', 'src/modules/customers/customer.service.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/customers`,
        evidence: 'Canonical bounded context em src/modules/customers/.',
        level: 2,
        parent: 'condstore-root',
        children: [],
        x: 4350,
        y: 250
    },
    {
        id: 'frank-scheduler',
        name: 'Frank Concurrency Scheduler',
        category: 'service',
        domain: 'IA Frank',
        layer: 'Application',
        status: 'production',
        isMvp: true,
        path: 'src/modules/frank/concurrency/frank-concurrency-scheduler.ts',
        directory: 'src/modules/frank/concurrency/',
        description: 'Gerenciador de concorrência global e per-tenant (FRANK-006) com fila round-robin, priority aging anti-starvation e suporte a AbortSignal.',
        responsibilities: [
            'Limitação de chamadas LLM simultâneas',
            'Isolamento por tenant na fila de execução',
            'Cancelamento imediato via AbortSignal',
            'Prevenção de starvation com priority aging'
        ],
        dependencies: ['frank-module'],
        dependents: ['frank-execution-runtime', 'frank-dag'],
        technologies: ['TypeScript', 'Node Events'],
        relatedFiles: ['src/modules/frank/concurrency/frank-concurrency-scheduler.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/frank/concurrency/frank-concurrency-scheduler.ts`,
        evidence: 'FRANK-006 em src/modules/frank/concurrency/frank-concurrency-scheduler.ts.',
        level: 2,
        parent: 'frank-module',
        children: [],
        x: 3500,
        y: 420
    },
    {
        id: 'frank-dag',
        name: 'Frank Dependency Task DAG',
        category: 'service',
        domain: 'IA Frank',
        layer: 'Application',
        status: 'production',
        isMvp: false,
        path: 'src/modules/frank/dag/frank-dag-engine.ts',
        directory: 'src/modules/frank/dag/',
        description: 'Engine de execução de tarefas baseada em grafos acíclicos dirigidos (DAG) (FRANK-007) com validação por algoritmo de Kahn.',
        responsibilities: [
            'Validação de DAG sem ciclos via Kahn',
            'Execução paralela de nós em estado READY',
            'Propagação determinística de falhas e cancelamentos',
            'Snapshots e auditoria de estado no MySQL'
        ],
        dependencies: ['frank-module', 'frank-scheduler'],
        dependents: ['frank-module'],
        technologies: ['TypeScript', 'Kahn Algorithm'],
        relatedFiles: ['src/modules/frank/dag/frank-dag-engine.ts', 'src/modules/frank/dag/frank-dag-validator.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/frank/dag`,
        evidence: 'FRANK-007 em src/modules/frank/dag/.',
        level: 2,
        parent: 'frank-module',
        children: [],
        x: 3760,
        y: 420
    },
    {
        id: 'frank-human-gate',
        name: 'Frank Human Gate Policy Engine',
        category: 'service',
        domain: 'IA Frank',
        layer: 'Application',
        status: 'production',
        isMvp: true,
        path: 'src/modules/frank/frank-human-gate-policy.ts',
        directory: 'src/modules/frank/',
        description: 'Motor de políticas para interceptar e exigir aprovação humana antes de executar ações operacionais de risco.',
        responsibilities: [
            'Classificação de risco de ferramentas (READ_ONLY vs MUTATION)',
            'Bloqueio de ações destrutivas sem aprovação prévia',
            'Geração de justificativa técnica e avaliação de impacto'
        ],
        dependencies: ['frank-module'],
        dependents: ['frank-execution-runtime', 'cockpit-module'],
        technologies: ['TypeScript', 'Zod'],
        relatedFiles: ['src/modules/frank/frank-human-gate-policy.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/frank/frank-human-gate-policy.ts`,
        evidence: 'Motor de aprovação em src/modules/frank/frank-human-gate-policy.ts.',
        level: 2,
        parent: 'frank-module',
        children: [],
        x: 4020,
        y: 420
    },
    {
        id: 'domine-event-bus',
        name: 'DOMINE Event Bus & DLQ',
        category: 'service',
        domain: 'Infrastructure',
        layer: 'Infrastructure',
        status: 'production',
        isMvp: true,
        path: 'src/modules/domine/event-bus.service.ts',
        directory: 'src/modules/domine/',
        description: 'Barramento de eventos operacionais com chave de idempotência, retries assíncronos e Dead Letter Queue (DLQ).',
        responsibilities: [
            'Publicação idempotente de eventos com chave de unicidade',
            'Processamento assíncrono com política de retry',
            'Roteamento para Dead Letter Queue (DLQ) em falhas persistentes'
        ],
        dependencies: ['infra-core', 'database-mysql'],
        dependents: ['orders-module', 'fulfillment-module', 'frank-observer'],
        technologies: ['TypeScript', 'MySQL DLQ'],
        relatedFiles: ['src/modules/domine/event-bus.service.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/domine`,
        evidence: 'Serviço DOMINE em src/modules/domine/event-bus.service.ts.',
        level: 2,
        parent: 'infra-core',
        children: [],
        x: 5200,
        y: 420
    },
    {
        id: 'cockpit-work-queue',
        name: 'Cockpit Work Queue',
        category: 'component',
        domain: 'Cockpit',
        layer: 'UI',
        status: 'production',
        isMvp: true,
        path: 'src/modules/cockpit/workspace/components/WorkQueue.tsx',
        directory: 'src/modules/cockpit/workspace/components/',
        description: 'Fila unificada de trabalho do operador com filtros por WorkItemCategory (conversas, frete, pedidos, exceções).',
        responsibilities: [
            'Renderização de lista de itens de trabalho prioritários',
            'Filtro por categoria e busca textual rápida',
            'Indicação visual de SLA e urgência'
        ],
        dependencies: ['cockpit-module'],
        dependents: ['cockpit-context-panel'],
        technologies: ['React', 'TypeScript', 'Tailwind CSS'],
        relatedFiles: ['src/modules/cockpit/workspace/components/WorkQueue.tsx', 'src/modules/cockpit/data/shared.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/cockpit/workspace/components/WorkQueue.tsx`,
        evidence: 'Componente em src/modules/cockpit/workspace/components/WorkQueue.tsx.',
        level: 3,
        parent: 'cockpit-module',
        children: [],
        x: 2650,
        y: 420
    },
    {
        id: 'cockpit-context-panel',
        name: 'Cockpit Context Panel',
        category: 'component',
        domain: 'Cockpit',
        layer: 'UI',
        status: 'production',
        isMvp: true,
        path: 'src/modules/cockpit/workspace/components/ContextPanel.tsx',
        directory: 'src/modules/cockpit/workspace/components/',
        description: 'Painel lateral de contexto acionado ao selecionar um item da fila, exibindo a operationalThread completa.',
        responsibilities: [
            'Exibição do fluxo contextual (cliente -> conversa -> cotação -> pedido -> logística)',
            'Integração com o assistente Frank em modo contexto',
            'Execução de ações disponíveis (WorkItemAction)'
        ],
        dependencies: ['cockpit-module', 'cockpit-work-queue'],
        dependents: [],
        technologies: ['React', 'TypeScript', 'Tailwind CSS'],
        relatedFiles: ['src/modules/cockpit/workspace/components/ContextPanel.tsx', 'src/modules/cockpit/workspace/types/frank-context.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/cockpit/workspace/components/ContextPanel.tsx`,
        evidence: 'Componente de contexto em src/modules/cockpit/workspace/components/ContextPanel.tsx.',
        level: 3,
        parent: 'cockpit-module',
        children: [],
        x: 2910,
        y: 420
    },
    {
        id: 'frank-execution-runtime',
        name: 'Frank Execution Runtime',
        category: 'service',
        domain: 'IA Frank',
        layer: 'Application',
        status: 'production',
        isMvp: true,
        path: 'src/modules/frank/frank-execution-runtime.ts',
        directory: 'src/modules/frank/',
        description: 'Pipeline canônico de execução de ferramentas da IA Frank com validação Zod, verificação de tenant e durable step checkpointing.',
        responsibilities: [
            'Validação estrita de entrada/saída via Zod',
            'Validação de pertença do tenantId no contexto',
            'Registro de checkpoints duráveis no MySQL',
            'Suporte a cancelamento por AbortSignal'
        ],
        dependencies: ['frank-module', 'frank-scheduler', 'frank-human-gate', 'database-mysql'],
        dependents: ['cockpit-module'],
        technologies: ['TypeScript', 'Zod', 'Drizzle ORM'],
        relatedFiles: ['src/modules/frank/frank-execution-runtime.ts', 'src/modules/frank/frank-execution-state.service.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/frank/frank-execution-runtime.ts`,
        evidence: 'Pipeline de execução em src/modules/frank/frank-execution-runtime.ts.',
        level: 3,
        parent: 'frank-module',
        children: [],
        x: 3500,
        y: 580
    },
    {
        id: 'frank-observer',
        name: 'Frank Telemetry Observer',
        category: 'service',
        domain: 'IA Frank',
        layer: 'Application',
        status: 'production',
        isMvp: true,
        path: 'src/modules/frank/observation/frank-observer.service.ts',
        directory: 'src/modules/frank/observation/',
        description: 'Serviço de escuta ativa de eventos operacionais para captura automática de sinais e anomalias logísticas.',
        responsibilities: [
            'Inscrição no subscribeOperationalEvent',
            'Deduplicação baseada em correlação de incidentes',
            'Disparo do pipeline de diagnóstico'
        ],
        dependencies: ['frank-module', 'domine-event-bus'],
        dependents: ['frank-diagnosis'],
        technologies: ['TypeScript', 'Event Bus'],
        relatedFiles: ['src/modules/frank/observation/frank-observer.service.ts', 'src/lib/events/operational-event-bus.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/frank/observation/frank-observer.service.ts`,
        evidence: 'FrankObserverService integrado em src/lib/events/operational-event-bus.ts.',
        level: 3,
        parent: 'frank-module',
        children: [],
        x: 3760,
        y: 580
    },
    {
        id: 'frank-diagnosis',
        name: 'Frank Diagnosis Pipeline',
        category: 'service',
        domain: 'IA Frank',
        layer: 'Application',
        status: 'production',
        isMvp: true,
        path: 'src/modules/frank/diagnosis/frank-diagnosis-pipeline.service.ts',
        directory: 'src/modules/frank/diagnosis/',
        description: 'Pipeline de montagem de cadeia de evidências e formulação de hipóteses diagnósticas.',
        responsibilities: [
            'Coleta de telemetria e contexto da exceção',
            'Avaliação de regras de negócio vs impacto operacional',
            'Geração de sugestão para o Human Gate'
        ],
        dependencies: ['frank-module', 'frank-observer'],
        dependents: ['frank-human-gate'],
        technologies: ['TypeScript', 'LLM Prompting'],
        relatedFiles: ['src/modules/frank/diagnosis/frank-diagnosis-pipeline.service.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/frank/diagnosis/frank-diagnosis-pipeline.service.ts`,
        evidence: 'Pipeline em src/modules/frank/diagnosis/frank-diagnosis-pipeline.service.ts.',
        level: 3,
        parent: 'frank-module',
        children: [],
        x: 4020,
        y: 580
    },
    {
        id: 'whatsapp-webhook-api',
        name: 'POST /api/whatsapp/incoming',
        category: 'api',
        domain: 'Atendimento',
        layer: 'Application',
        status: 'production',
        isMvp: true,
        path: 'src/app/api/whatsapp/incoming/route.ts',
        directory: 'src/app/api/whatsapp/incoming/',
        url: '/api/whatsapp/incoming',
        access: 'Público / Twilio HMAC',
        nodeType: 'API / Backend',
        description: 'URL: /api/whatsapp/incoming\nTipo: API / Backend\nAcesso: Público / Twilio HMAC\nDomínio: Atendimento\nStatus: Live\nDescrição: Endpoint de webhook que recebe e processa eventos e mensagens do Twilio WhatsApp com validação de assinatura HMAC.',
        responsibilities: [
            'Validação rigorosa do header X-Twilio-Signature',
            'Resolução do tenant pelo número receptor',
            'Orquestração do atendimento inbound com orquestrador endurecido'
        ],
        dependencies: ['conversations-module', 'integration-twilio'],
        dependents: ['cockpit-module'],
        technologies: ['Next.js Route Handler', 'Twilio SDK', 'Crypto HMAC'],
        relatedFiles: ['src/app/api/whatsapp/incoming/route.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/app/api/whatsapp/incoming/route.ts`,
        evidence: 'Endpoint com validação Twilio em src/app/api/whatsapp/incoming/route.ts.',
        level: 3,
        parent: 'conversations-module',
        children: [],
        x: 100,
        y: 420
    },
    {
        id: 'freight-api',
        name: 'POST /api/freight/simulate',
        category: 'api',
        domain: 'Logística',
        layer: 'Application',
        status: 'production',
        isMvp: true,
        path: 'src/app/api/freight/simulate/route.ts',
        directory: 'src/app/api/freight/simulate/',
        url: '/api/freight/simulate',
        access: 'Autenticado',
        nodeType: 'API / Backend',
        description: 'URL: /api/freight/simulate\nTipo: API / Backend\nAcesso: Autenticado\nDomínio: Logística\nStatus: Live\nDescrição: API de simulação e cotação de frete em tempo real conectada ao Melhor Envio e regras locais.',
        responsibilities: [
            'Cotação de prazos e valores de frete por transportadora',
            'Persistência da simulação no MySQL',
            'Cálculo de margem e aplicação de regras de embalagem'
        ],
        dependencies: ['fulfillment-module', 'database-mysql'],
        dependents: ['orders-module'],
        technologies: ['Next.js Route Handler', 'TypeScript'],
        relatedFiles: ['src/app/api/freight/simulate/route.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/app/api/freight/simulate/route.ts`,
        evidence: 'Endpoint em src/app/api/freight/simulate/route.ts.',
        level: 3,
        parent: 'fulfillment-module',
        children: [],
        x: 950,
        y: 420
    },
    {
        id: 'drizzle-schema',
        name: 'Drizzle MySQL Schema',
        category: 'entity',
        domain: 'Database',
        layer: 'Database',
        status: 'production',
        isMvp: true,
        path: 'src/drizzle/schema.ts',
        directory: 'src/drizzle/',
        description: 'Definição ORM das tabelas relacionais do MySQL com obrigatoriedade de tenant_id.',
        responsibilities: [
            'Mapeamento de entidades (users, tenants, conversations, orders, shipments, frank_*)',
            'Garantia de índices de performance e chaves estrangeiras',
            'Suporte nativo a Soft-Delete'
        ],
        dependencies: ['database-mysql'],
        dependents: ['conversations-module', 'orders-module', 'fulfillment-module', 'frank-module'],
        technologies: ['Drizzle ORM', 'TypeScript', 'MySQL 8'],
        relatedFiles: ['src/drizzle/schema.ts', 'tools/drizzle/fix-snapshot-drift.cjs'],
        githubUrl: `${GITHUB_BASE_URL}/src/drizzle/schema.ts`,
        evidence: 'Schema central em src/drizzle/schema.ts com verificação via npm run db:verify.',
        level: 3,
        parent: 'database-mysql',
        children: [],
        x: 5200,
        y: 580
    },
    {
        id: 'llm-gateway',
        name: 'LLM Central Gateway',
        category: 'service',
        domain: 'IA Frank',
        layer: 'Infrastructure',
        status: 'production',
        isMvp: true,
        path: 'src/core/ai/llm-gateway.ts',
        directory: 'src/core/ai/',
        description: 'Gateway unificado de comunicação com LLMs (OpenAI/compatíveis) com redação de PII e prompt guard.',
        responsibilities: [
            'Redação automática de dados sensíveis PII antes do envio',
            'Mapeamento de modelos e redundância de provedores',
            'Controle de consumo de tokens e custos por tenant'
        ],
        dependencies: ['infra-core', 'integration-openai'],
        dependents: ['frank-module'],
        technologies: ['OpenAI SDK', 'TypeScript', 'Crypto PII'],
        relatedFiles: ['src/core/ai/llm-gateway.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/core/ai/llm-gateway.ts`,
        evidence: 'Gateway unificado em src/core/ai/llm-gateway.ts.',
        level: 3,
        parent: 'frank-module',
        children: [],
        x: 3500,
        y: 740
    },
    {
        id: 'finops-module',
        name: 'FinOps & Billing Analytics',
        category: 'module',
        domain: 'FinOps',
        layer: 'Domain',
        status: 'production',
        isMvp: false,
        path: 'src/modules/billing',
        directory: 'src/modules/billing/',
        description: 'Módulo de auditoria de custos de frete, cobrança SaaS via Stripe e analytics financeiro da operação.',
        responsibilities: [
            'Auditoria de faturas de frete comparadas ao cotado',
            'Sincronização de planos de assinatura e entitlements',
            'Monitoramento de margem por pedido'
        ],
        dependencies: ['orders-module', 'integration-stripe'],
        dependents: ['cockpit-module'],
        technologies: ['Stripe SDK', 'TypeScript'],
        relatedFiles: ['src/modules/billing/index.ts', 'src/workers/finops-worker.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/billing`,
        evidence: 'Módulo Billing e workers em src/modules/billing/.',
        level: 2,
        parent: 'condstore-root',
        children: ['integration-stripe'],
        x: 1800,
        y: 420
    },
    {
        id: 'edge-middleware',
        name: 'Next.js Edge Middleware',
        category: 'infra',
        domain: 'Infrastructure',
        layer: 'Infrastructure',
        status: 'production',
        isMvp: true,
        path: 'src/middleware.ts',
        directory: 'src/',
        description: 'Edge Security Middleware que intercepta todas as requisições, valida tokens JWT de sessão e previne header spoofing.',
        responsibilities: [
            'Validação de sessão JWT na camada Edge',
            'Sanitização do header x-auth-tenant-id para evitar fraude',
            'Redirecionamento de rotas protegidas vs públicas'
        ],
        dependencies: ['infra-core'],
        dependents: ['cockpit-module', 'whatsapp-webhook-api'],
        technologies: ['Next.js Edge Middleware', 'JOSE JWT'],
        relatedFiles: ['src/middleware.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/middleware.ts`,
        evidence: 'Middleware central em src/middleware.ts.',
        level: 4,
        parent: 'infra-core',
        children: [],
        x: 5200,
        y: 740
    },
    {
        id: 'database-mysql',
        name: 'MySQL Database',
        category: 'infra',
        domain: 'Database',
        layer: 'Database',
        status: 'production',
        isMvp: true,
        path: 'infra/mysql',
        directory: 'infra/',
        description: 'Banco de dados relacional primário (MySQL 8 / TiDB) para persistência transacional com isolamento de tenant.',
        responsibilities: [
            'Armazenamento transacional ACID',
            'Garantia de isolamento multi-tenant por coluna tenant_id',
            'Execução de migrations com Drizzle Kit'
        ],
        dependencies: [],
        dependents: ['drizzle-schema'],
        technologies: ['MySQL 8', 'mysql2 driver'],
        relatedFiles: ['src/drizzle/schema.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/drizzle`,
        evidence: 'Driver mysql2 3.24.2 em package.json.',
        level: 4,
        parent: 'infra-core',
        children: ['drizzle-schema'],
        x: 5460,
        y: 740
    },
    {
        id: 'integration-twilio',
        name: 'Twilio WhatsApp API',
        category: 'integration',
        domain: 'Integrations',
        layer: 'External',
        status: 'production',
        isMvp: true,
        path: 'src/server/twilio',
        directory: 'src/server/twilio/',
        description: 'Conector para envio e recebimento de mensagens WhatsApp via API oficial da Twilio.',
        responsibilities: [
            'Envio de mensagens outbound e templates',
            'Recepção e validação de webhooks inbound',
            'Gestão de mídia e status de entrega'
        ],
        dependencies: [],
        dependents: ['conversations-module', 'whatsapp-webhook-api'],
        technologies: ['Twilio Node SDK', 'Webhooks'],
        relatedFiles: ['src/server/twilio/index.ts', 'src/app/api/whatsapp/incoming/route.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/server/twilio`,
        evidence: 'SDK Twilio e handlers em src/server/twilio.',
        level: 4,
        parent: 'conversations-module',
        children: [],
        x: 100,
        y: 580
    },
    {
        id: 'integration-melhor-envio',
        name: 'Melhor Envio API/SDK',
        category: 'integration',
        domain: 'Integrations',
        layer: 'External',
        status: 'production',
        isMvp: true,
        path: 'src/modules/fulfillment/freight/adapters/melhor-envio.ts',
        directory: 'src/modules/fulfillment/freight/adapters/',
        description: 'Adapter de integração com a API do Melhor Envio para cotação de fretes e compra de etiquetas.',
        responsibilities: [
            'Cotação de frete multi-carrier (Jadlog, Latam Cargo, Azul Cargo, Correios)',
            'Geração e compra de etiquetas de envio',
            'Rastreamento centralizado de pacotes'
        ],
        dependencies: [],
        dependents: ['fulfillment-module'],
        technologies: ['REST API', 'Melhor Envio OAuth'],
        relatedFiles: ['src/modules/fulfillment/freight/adapters/melhor-envio.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/fulfillment/freight/adapters/melhor-envio.ts`,
        evidence: 'Adapter em src/modules/fulfillment/freight/adapters/melhor-envio.ts.',
        level: 4,
        parent: 'fulfillment-module',
        children: [],
        x: 950,
        y: 580
    },
    {
        id: 'integration-stripe',
        name: 'Stripe Billing API',
        category: 'integration',
        domain: 'Integrations',
        layer: 'External',
        status: 'production',
        isMvp: true,
        path: 'src/modules/billing',
        directory: 'src/modules/billing/',
        description: 'Integração de pagamentos SaaS, checkout sessions e renovação de assinaturas.',
        responsibilities: [
            'Processamento de pagamentos com cartão/Pix',
            'Gerenciamento do ciclo de vida da assinatura',
            'Webhook listener para eventos de pagamento'
        ],
        dependencies: [],
        dependents: ['finops-module'],
        technologies: ['Stripe Node SDK', 'Stripe Webhooks'],
        relatedFiles: ['src/app/api/webhook/stripe/route.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/app/api/webhook/stripe/route.ts`,
        evidence: 'SDK Stripe e webhook em src/app/api/webhook/stripe/route.ts.',
        level: 4,
        parent: 'finops-module',
        children: [],
        x: 1800,
        y: 580
    },
    {
        id: 'integration-openai',
        name: 'OpenAI API Gateway',
        category: 'integration',
        domain: 'Integrations',
        layer: 'External',
        status: 'production',
        isMvp: true,
        path: 'src/core/ai/llm-gateway.ts',
        directory: 'src/core/ai/',
        description: 'Conexão com provedores de IA (OpenAI / Azure OpenAI) para inferência dos modelos GPT-4o e mini.',
        responsibilities: [
            'Processamento de linguagem natural',
            'Execução de function calling e structured outputs',
            'Suporte a streaming de respostas'
        ],
        dependencies: [],
        dependents: ['llm-gateway'],
        technologies: ['OpenAI REST API', 'GPT-4o'],
        relatedFiles: ['src/core/ai/llm-gateway.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/core/ai/llm-gateway.ts`,
        evidence: 'SDK OpenAI e gateway em src/core/ai/llm-gateway.ts.',
        level: 4,
        parent: 'frank-module',
        children: [],
        x: 3760,
        y: 740
    },
    {
        id: 'integration-qdrant',
        name: 'Qdrant Vector Database',
        category: 'integration',
        domain: 'Integrations',
        layer: 'External',
        status: 'partial',
        isMvp: false,
        path: 'src/modules/knowledge',
        directory: 'src/modules/knowledge/',
        description: 'Banco de dados vetorial para busca semântica, RAG e base de conhecimento da operação.',
        responsibilities: [
            'Indexação vetorial de manuais de atendimento e transporte',
            'Busca semântica de regras de negócio em tempo real'
        ],
        dependencies: [],
        dependents: ['frank-module'],
        technologies: ['Qdrant', 'Vector Embeddings'],
        relatedFiles: ['docker-compose.qdrant.yml', 'src/workers/knowledge-ingest.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/modules/knowledge`,
        evidence: 'docker-compose.qdrant.yml e src/workers/knowledge-ingest.ts.',
        level: 4,
        parent: 'frank-module',
        children: [],
        x: 4020,
        y: 740
    },
    {
        id: 'infra-core',
        name: 'Núcleo Transversal de Infraestrutura',
        category: 'infra',
        domain: 'Infrastructure',
        layer: 'Infrastructure',
        status: 'production',
        isMvp: true,
        path: 'src/infra',
        directory: 'src/infra/',
        description: 'Serviços transversais de autenticação, criptografia AES-256 para PII, logger JSON e observabilidade.',
        responsibilities: [
            'Criptografia e mascaramento de dados sensíveis (PII)',
            'Logger estruturado JSON com sanitização automática',
            'Gerenciamento de sessão JWT e passwords hash via bcrypt'
        ],
        dependencies: [],
        dependents: ['condstore-root', 'edge-middleware', 'domine-event-bus'],
        technologies: ['TypeScript', 'Node Crypto', 'Bcrypt', 'Pino Logger'],
        relatedFiles: ['src/infra/auth/password.ts', 'src/infra/crypto/pii.ts'],
        githubUrl: `${GITHUB_BASE_URL}/src/infra`,
        evidence: 'Serviços sob src/infra/ e ARCHITECTURE.md.',
        level: 2,
        parent: 'condstore-root',
        children: ['edge-middleware', 'domine-event-bus'],
        x: 5200,
        y: 250
    }
];

// 2. Flows
const FLOWS = [
    {
        id: 'whatsapp-order-flow',
        name: 'WhatsApp -> Cotação -> Pedido -> Logística',
        description: 'Entrada de mensagem via WhatsApp, processamento por regras/Frank, criação de cotação de frete, aceitação, geração de pedido e expedição no Melhor Envio.',
        steps: [
            { nodeId: 'integration-twilio', title: '1. Inbound WhatsApp', description: 'Twilio recebe a mensagem via WhatsApp e aciona a API de Webhook.' },
            { nodeId: 'whatsapp-webhook-api', title: '2. Webhook Ingest', description: 'Validação de assinatura HMAC do Twilio e roteamento da requisição.' },
            { nodeId: 'conversations-module', title: '3. Atendimento & Chat', description: 'Sessão de conversa é carregada/criada no Bounded Context canônico.' },
            { nodeId: 'frank-module', title: '4. IA Frank Supervisionado', description: 'Co-piloto analisa intenção do cliente e sugere/executa cotação.' },
            { nodeId: 'freight-api', title: '5. Simulação de Frete', description: 'Engine de frete consulta Melhor Envio e tabelas locais.' },
            { nodeId: 'orders-module', title: '6. Emissão de Pedido', description: 'Pedido é criado com base na cotação com status ACCEPTED.' },
            { nodeId: 'fulfillment-module', title: '7. Expedição Logística', description: 'Geração do pacote de entrega e emissão de etiqueta no Melhor Envio.' },
            { nodeId: 'integration-melhor-envio', title: '8. Transportadora Final', description: 'Envio dos dados da carga para a transportadora contratada.' }
        ]
    },
    {
        id: 'frank-supervision-flow',
        name: 'IA Frank: Sinal -> Diagnóstico -> Human Gate -> Execução',
        description: 'Captura de sinal por evento operacional, diagnóstico de anomalias, avaliação de risco pelo Human Gate Policy e execução supervisionada com checkpoint.',
        steps: [
            { nodeId: 'domine-event-bus', title: '1. Evento Operacional', description: 'Barramento DOMINE ou canal de telemetria publica sinal de anomalia.' },
            { nodeId: 'frank-observer', title: '2. Frank Observer', description: 'Observer monitora barramento e correlaciona sinais recorrentes.' },
            { nodeId: 'frank-diagnosis', title: '3. Diagnostic Engine', description: 'Frank compõe evidências e gera plano de ação diagnóstico.' },
            { nodeId: 'frank-human-gate', title: '4. Human Gate Policy', description: 'Políticas classificam o nível de risco e exigem aprovação se necessário.' },
            { nodeId: 'cockpit-module', title: '5. Aprovação no Cockpit', description: 'Operador revisa sugestão e autoriza a execução no painel.' },
            { nodeId: 'frank-execution-runtime', title: '6. Execução com Checkpoint', description: 'Runtime executa a ferramenta com durable step checkpoints e rollback.' }
        ]
    },
    {
        id: 'multi-tenant-auth-flow',
        name: 'Segurança & Isolamento Multi-Tenant',
        description: 'Interceptação Edge no Middleware, validação JWT, injeção de headers de contexto e isolamento rigoroso por tenant_id nas consultas Drizzle.',
        steps: [
            { nodeId: 'edge-middleware', title: '1. Edge Security Middleware', description: 'Interceptação no Next.js Edge, remoção de headers falsificados e validação JWT.' },
            { nodeId: 'infra-core', title: '2. Infraestrutura Auth', description: 'Validação de sessão, verificação de roles e geração de token seguro.' },
            { nodeId: 'drizzle-schema', title: '3. Drizzle ORM Multi-Tenant', description: 'Filtro automático de tenant_id em todas as queries e schemas do banco.' },
            { nodeId: 'database-mysql', title: '4. Persistência Isolada', description: 'Banco de dados relacional executando queries restritas por tenant.' }
        ]
    }
];

// 3. PR Diff Evolution Cards
const PR_DIFFS = [
    {
        id: 'pr-latest-bounded-contexts',
        title: 'Unificação dos Bounded Contexts Canônicos de Conversas, Clientes e Pedidos',
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
];

// Core Edges
const CORE_EDGES = [
    { id: 'e1', source: 'condstore-root', target: 'conversations-module', type: 'contains', description: 'Contém o Bounded Context de Atendimento' },
    { id: 'e2', source: 'condstore-root', target: 'fulfillment-module', type: 'contains', description: 'Contém o Bounded Context de Logística' },
    { id: 'e3', source: 'condstore-root', target: 'orders-module', type: 'contains', description: 'Contém o Bounded Context de Pedidos' },
    { id: 'e4', source: 'condstore-root', target: 'cockpit-module', type: 'contains', description: 'Contém a camada UI do Cockpit V2' },
    { id: 'e5', source: 'condstore-root', target: 'frank-module', type: 'contains', description: 'Contém a IA Frank Supervisionada' },
    { id: 'e6', source: 'condstore-root', target: 'infra-core', type: 'contains', description: 'Contém a Infraestrutura Transversal' },
    { id: 'e7', source: 'condstore-root', target: 'customers-module', type: 'contains', description: 'Contém a Gestão de Clientes' },

    { id: 'e-wa-tw', source: 'whatsapp-webhook-api', target: 'integration-twilio', type: 'calls', description: 'Recebe webhooks assinados do Twilio' },
    { id: 'e-wa-conv', source: 'whatsapp-webhook-api', target: 'conversations-module', type: 'data_flow', description: 'Atualiza sessão de conversa canônica' },
    { id: 'e-conv-cust', source: 'conversations-module', target: 'customers-module', type: 'depends_on', description: 'Resolve cliente via hash de telefone' },
    { id: 'e-conv-frk', source: 'conversations-module', target: 'frank-module', type: 'calls', description: 'Aciona Frank para análise de intenção' },
    { id: 'e-frk-lgw', source: 'frank-module', target: 'llm-gateway', type: 'calls', description: 'Executa inferência com PII redaction' },
    { id: 'e-lgw-oai', source: 'llm-gateway', target: 'integration-openai', type: 'calls', description: 'Chama API do OpenAI' },
    { id: 'e-conv-frt', source: 'conversations-module', target: 'freight-api', type: 'calls', description: 'Solicita simulação de frete' },
    { id: 'e-frt-ful', source: 'freight-api', target: 'fulfillment-module', type: 'depends_on', description: 'Executa cálculo na engine de frete' },
    { id: 'e-ful-mel', source: 'fulfillment-module', target: 'integration-melhor-envio', type: 'calls', description: 'Consulta transportadoras no Melhor Envio' },
    { id: 'e-ord-frt', source: 'orders-module', target: 'freight-api', type: 'depends_on', description: 'Valida cotação ACCEPTED antes de criar pedido' },
    { id: 'e-ord-ful', source: 'orders-module', target: 'fulfillment-module', type: 'data_flow', description: 'Instancia shipment de envio' },
    { id: 'e-cockpit-queue', source: 'cockpit-module', target: 'cockpit-work-queue', type: 'contains', description: 'Gerencia fila de trabalho unificada' },
    { id: 'e-cockpit-panel', source: 'cockpit-module', target: 'cockpit-context-panel', type: 'contains', description: 'Carrega contexto detalhado' },
    { id: 'e-cockpit-conv', source: 'cockpit-module', target: 'conversations-module', type: 'data_flow', description: 'Lê e responde conversas da fila' },
    { id: 'e-cockpit-ord', source: 'cockpit-module', target: 'orders-module', type: 'data_flow', description: 'Exibe status de pedidos e pendências' },
    { id: 'e-cockpit-frk', source: 'cockpit-module', target: 'frank-module', type: 'data_flow', description: 'Exibe sugestões e solicita aprovação' },

    { id: 'e-frk-sch', source: 'frank-module', target: 'frank-scheduler', type: 'contains', description: 'Controla concorrência per-tenant' },
    { id: 'e-frk-dag', source: 'frank-module', target: 'frank-dag', type: 'contains', description: 'Valida planos DAG sem ciclos' },
    { id: 'e-frk-hg', source: 'frank-module', target: 'frank-human-gate', type: 'depends_on', description: 'Aplica Human Gate Policy' },
    { id: 'e-frk-exec', source: 'frank-module', target: 'frank-execution-runtime', type: 'contains', description: 'Executa ferramentas com checkpoint' },
    { id: 'e-frk-obs', source: 'frank-observer', target: 'domine-event-bus', type: 'event', description: 'Escuta barramento de eventos' },
    { id: 'e-frk-diag', source: 'frank-observer', target: 'frank-diagnosis', type: 'data_flow', description: 'Encaminha anomalia para diagnóstico' },
    { id: 'e-diag-hg', source: 'frank-diagnosis', target: 'frank-human-gate', type: 'data_flow', description: 'Envia proposta de ação para o Human Gate' },
    { id: 'e-frk-qdr', source: 'frank-module', target: 'integration-qdrant', type: 'calls', description: 'Busca contexto semântico via RAG' },

    { id: 'e-mid-infra', source: 'edge-middleware', target: 'infra-core', type: 'depends_on', description: 'Valida tokens JWT e sessão' },
    { id: 'e-sch-db', source: 'drizzle-schema', target: 'database-mysql', type: 'contains', description: 'Mapeia tabelas no MySQL' },
    { id: 'e-dom-db', source: 'domine-event-bus', target: 'database-mysql', type: 'data_flow', description: 'Persiste DLQ no MySQL' },
    { id: 'e-fin-str', source: 'finops-module', target: 'integration-stripe', type: 'calls', description: 'Sincroniza pagamentos com Stripe' }
];

// Recursively discover all real page.tsx and route.ts files in src/app
function discoverRealRoutesFromDisk(): DiscoveredRoute[] {
    const discovered: DiscoveredRoute[] = [];

    function traverseDir(dir: string, segments: string[]) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                traverseDir(fullPath, [...segments, entry.name]);
            } else if (entry.isFile()) {
                if (entry.name === 'page.tsx' || entry.name === 'page.ts' || entry.name === 'route.ts') {
                    const isApi = entry.name === 'route.ts';
                    const routeSegments: string[] = [];
                    let isPublicGroup = false;
                    let isAppGroup = false;

                    for (const seg of segments) {
                        if (seg.startsWith('(') && seg.endsWith(')')) {
                            if (seg === '(public)') isPublicGroup = true;
                            if (seg === '(app)') isAppGroup = true;
                            continue; // Route group (does not affect URL)
                        }
                        routeSegments.push(seg);
                    }

                    const urlPath = '/' + routeSegments.join('/');
                    const normalizedUrl = urlPath === '/' ? '/' : urlPath.replace(/\/+/g, '/');
                    const relFilePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

                    discovered.push({
                        urlPath: normalizedUrl,
                        filePath: relFilePath,
                        routeType: isApi ? 'api' : 'page',
                        isPublicGroup,
                        isAppGroup
                    });
                }
            }
        }
    }

    traverseDir(APP_DIR, []);
    return discovered;
}

// Parse registry metadata as lookup map keyed by URL path
function parseRegistryMetadata(): Map<string, RouteEntry> {
    const registryMap = new Map<string, RouteEntry>();
    if (!fs.existsSync(REGISTRY_FILE)) return registryMap;

    const content = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('|') && !trimmed.includes('---') && !trimmed.includes('Path')) {
            const parts = trimmed.split('|').map(p => p.trim());
            if (parts.length >= 8 && parts[1].startsWith('/')) {
                registryMap.set(parts[1], {
                    path: parts[1],
                    method: parts[2] || 'GET',
                    access: parts[3] || '',
                    auth: parts[4] || '',
                    domain: parts[5] || '',
                    status: parts[6] || '',
                    description: parts[7] || ''
                });
            }
        }
    }
    return registryMap;
}

// Map domain & parent placement
function mapDomainInfo(domainRaw: string, routePath: string): { domainName: string; parentId: string; baseX: number; baseY: number } {
    const d = (domainRaw || '').toLowerCase();

    if (d === 'cockpit' || routePath.startsWith('/cockpit')) return { domainName: 'Cockpit', parentId: 'cockpit-module', baseX: 2650, baseY: 600 };
    if (d === 'conversas' || d === 'atendimento' || d === 'auth' || routePath.startsWith('/atendimento') || routePath.startsWith('/conversas')) return { domainName: 'Atendimento', parentId: 'conversations-module', baseX: 100, baseY: 600 };
    if (d === 'frete' || d === 'logistica' || routePath.startsWith('/frete') || routePath.startsWith('/logistica') || routePath.startsWith('/shipments')) return { domainName: 'Logística', parentId: 'fulfillment-module', baseX: 950, baseY: 600 };
    if (d === 'pedidos' || routePath.startsWith('/pedidos') || routePath.startsWith('/orders')) return { domainName: 'Orders', parentId: 'orders-module', baseX: 1800, baseY: 600 };
    if (d === 'frank' || routePath.startsWith('/frank')) return { domainName: 'IA Frank', parentId: 'frank-module', baseX: 3500, baseY: 900 };
    if (d === 'clientes' || routePath.startsWith('/clientes') || routePath.startsWith('/customers')) return { domainName: 'Clientes', parentId: 'customers-module', baseX: 4350, baseY: 600 };
    if (d === 'domine' || d === 'operacao' || routePath.startsWith('/domine')) return { domainName: 'Infrastructure', parentId: 'domine-event-bus', baseX: 5200, baseY: 900 };
    if (d === 'ops' || d === 'console' || d === 'lgpd' || d === 'internal' || d === 'backend' || routePath.startsWith('/api/admin') || routePath.startsWith('/api/ops')) return { domainName: 'Infrastructure', parentId: 'infra-core', baseX: 5200, baseY: 1200 };
    if (d === 'vendas' || routePath.startsWith('/vendas')) return { domainName: 'Vendas', parentId: 'orders-module', baseX: 1800, baseY: 1200 };
    if (d === 'configuracoes' || d === 'tenant' || routePath.startsWith('/configuracoes') || routePath.startsWith('/settings')) return { domainName: 'Governança / Tenant', parentId: 'infra-core', baseX: 6050, baseY: 600 };
    if (d === 'mvp' || routePath.startsWith('/mvp')) return { domainName: 'MVP Core', parentId: 'condstore-root', baseX: 6900, baseY: 600 };

    return { domainName: 'Public / Marketing', parentId: 'condstore-root', baseX: 7750, baseY: 600 };
}

// Infer clean access level based on route path, route group, and registry metadata
function inferAccessLevel(realRoute: DiscoveredRoute, regMeta?: RouteEntry): string {
    if (regMeta && regMeta.access) {
        if (regMeta.access === 'internal') return 'Interno / autenticado';
        if (regMeta.access === 'public') return 'Público';
        if (regMeta.access === 'authenticated') return 'Autenticado';
    }
    if (realRoute.isPublicGroup) return 'Público';
    if (realRoute.isAppGroup || realRoute.urlPath.startsWith('/cockpit')) return 'Autenticado';
    if (realRoute.urlPath.startsWith('/api/public') || realRoute.urlPath.startsWith('/api/whatsapp')) return 'Público';
    if (realRoute.urlPath.startsWith('/api/admin')) return 'Interno / autenticado';
    if (realRoute.routeType === 'api') return 'Autenticado';
    return 'Público';
}

function generateSitemapData() {
    console.log('🔄 Synchronizing Sitemap Architecture Data with repo...');

    // 1. Discover all real routes in src/app (Source of Truth)
    const realRoutes = discoverRealRoutesFromDisk();
    console.log(`📁 Discovered ${realRoutes.length} real route files in src/app.`);

    if (realRoutes.length === 0) {
        throw new Error('❌ Fail-closed: No real routes discovered in src/app!');
    }

    // 2. Parse registry metadata
    const registryMap = parseRegistryMetadata();
    console.log(`📋 Parsed ${registryMap.size} route metadata entries from registry.`);

    const generatedNodes: any[] = [...CORE_NODES];
    const generatedEdges: any[] = [...CORE_EDGES];

    // Domain position counters for spatial grid
    const domainCounters: Record<string, number> = {};

    // Map page IDs for calls edges
    const pageRouteMap = new Map<string, string>();
    const apiRouteMap = new Map<string, string>();

    let processedCount = 0;

    realRoutes.forEach(r => {
        const isApi = r.routeType === 'api';
        const nodeType = isApi ? 'API / Backend' : 'Página';
        const category = isApi ? 'api' : 'page';
        const layer = isApi ? 'Application' : 'UI';

        // Check if existing core node already represents this exact URL
        const existingCoreNode = generatedNodes.find(n => n.url === r.urlPath);
        if (existingCoreNode) {
            existingCoreNode.githubUrl = `${GITHUB_BASE_URL}/${r.filePath}`;
            existingCoreNode.nodeType = nodeType;
            return;
        }

        // Get metadata from registry if available
        const regMeta = registryMap.get(r.urlPath);

        // Fail-closed verification: Ensure file path actually exists
        if (!fs.existsSync(path.join(process.cwd(), r.filePath))) {
            throw new Error(`❌ Fail-closed: Discovered route file does not exist on disk: ${r.filePath}`);
        }

        // Clean ID
        const slug = r.urlPath.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'root';
        const nodeId = `route-${category}-${slug}`;

        if (isApi) apiRouteMap.set(r.urlPath, nodeId);
        else pageRouteMap.set(r.urlPath, nodeId);

        const domainRaw = regMeta?.domain || '';
        const { domainName, parentId, baseX, baseY } = mapDomainInfo(domainRaw, r.urlPath);

        // Position calculation
        const count = domainCounters[domainName] || 0;
        domainCounters[domainName] = count + 1;

        const col = count % 3;
        const row = Math.floor(count / 3);
        const x = baseX + col * 260;
        const y = baseY + row * 140;

        const dirPath = path.dirname(r.filePath) + '/';
        const githubUrl = `${GITHUB_BASE_URL}/${r.filePath}`;

        const accessFormatted = inferAccessLevel(r, regMeta);
        const statusFormatted = regMeta?.status ? (regMeta.status === 'live' ? 'Live' : regMeta.status) : 'Live';

        const descriptionText = regMeta?.description || (isApi ? `Endpoint para operação ${r.urlPath}.` : `Interface do operador para ${r.urlPath}.`);

        // Standardized Description string
        const standardizedDescription = [
            `URL: ${r.urlPath}`,
            `Tipo: ${nodeType}`,
            `Acesso: ${accessFormatted}`,
            `Domínio: ${domainName}`,
            `Status: ${statusFormatted}`,
            `Descrição: ${descriptionText}`
        ].join('\n');

        const isMvp = domainRaw === 'MVP' || r.urlPath.startsWith('/mvp') || regMeta?.auth === 'MVP';

        const nodeObj = {
            id: nodeId,
            name: `${nodeType}: ${r.urlPath}`,
            category: category as any,
            domain: domainName,
            layer: layer as any,
            status: 'production',
            isMvp,
            path: r.filePath,
            directory: dirPath,
            url: r.urlPath,
            access: accessFormatted,
            nodeType,
            description: standardizedDescription,
            responsibilities: [
                isApi ? `Processamento de requisições ${regMeta?.method || 'HTTP'} em ${r.urlPath}` : `Interface UI para a rota ${r.urlPath}`,
                `Controle de acesso ${accessFormatted}`,
                `Domínio ${domainName}`
            ],
            dependencies: [parentId],
            dependents: [],
            technologies: ['Next.js 16 App Router', 'TypeScript', isApi ? 'Route Handler' : 'React 19'],
            relatedFiles: [r.filePath],
            githubUrl,
            evidence: `Arquivo de rota real ${r.filePath} em ${dirPath}.`,
            level: 3,
            parent: parentId,
            x,
            y
        };

        generatedNodes.push(nodeObj);
        processedCount++;

        // Add parent containment edge
        generatedEdges.push({
            id: `edge-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            type: 'contains',
            description: `Contém ${nodeType.toLowerCase()} ${r.urlPath}`
        });
    });

    // Add Calls Edges from Pages to corresponding APIs (e.g. /cockpit/orders -> /api/cockpit/orders)
    pageRouteMap.forEach((pageId, pagePath) => {
        const correspondingApiPath = `/api${pagePath}`;
        const apiId = apiRouteMap.get(correspondingApiPath);
        if (apiId) {
            generatedEdges.push({
                id: `edge-calls-${pageId}-${apiId}`,
                source: pageId,
                target: apiId,
                type: 'calls',
                description: `Página ${pagePath} chama API ${correspondingApiPath}`
            });
        }
    });

    // Code output formatting
    const code = `// AUTO-GENERATED BY scripts/generate-sitemap-data.ts. DO NOT EDIT MANUALLY.
// Run 'npm run routes:sync' or 'npm run sitemap:generate' to update.

export type NodeCategory =
  | 'domain'
  | 'module'
  | 'service'
  | 'component'
  | 'page'
  | 'api'
  | 'entity'
  | 'integration'
  | 'infra'
  | 'ai_tool'
  | 'event'
  | 'flow_step';

export type NodeStatus =
  | 'production'
  | 'partial'
  | 'implemented'
  | 'experimental'
  | 'planned'
  | 'out_of_scope'
  | 'unconfirmed';

export type ViewPerspective =
  | 'architecture'
  | 'flow'
  | 'dependencies'
  | 'data'
  | 'integrations'
  | 'ai'
  | 'infra'
  | 'multi_tenant'
  | 'stack';

export interface ArchNode {
  id: string;
  name: string;
  category: NodeCategory;
  domain: string;
  layer: 'UI' | 'Application' | 'Domain' | 'Infrastructure' | 'Database' | 'External';
  status: NodeStatus;
  isMvp: boolean;
  path: string;
  directory: string;
  description: string;
  responsibilities: string[];
  dependencies: string[];
  dependents: string[];
  technologies: string[];
  relatedFiles: string[];
  githubUrl: string;
  evidence: string;
  level: 1 | 2 | 3 | 4;
  parent?: string;
  children?: string[];
  x?: number;
  y?: number;
  url?: string;
  access?: string;
  nodeType?: string;
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  type: 'depends_on' | 'calls' | 'data_flow' | 'event' | 'contains';
  description?: string;
}

export interface ArchFlowStep {
  nodeId: string;
  title: string;
  description: string;
}

export interface ArchFlow {
  id: string;
  name: string;
  description: string;
  steps: ArchFlowStep[];
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
  prDiffs: ${JSON.stringify(PR_DIFFS, null, 2)},
  flows: ${JSON.stringify(FLOWS, null, 2)},
  nodes: ${JSON.stringify(generatedNodes, null, 2)},
  edges: ${JSON.stringify(generatedEdges, null, 2)}
};
`;

    fs.writeFileSync(OUTPUT_FILE, code, 'utf-8');
    console.log(`✅ Generated ${generatedNodes.length} nodes (${processedCount} real routes from src/app) and ${generatedEdges.length} edges in ${OUTPUT_FILE}.`);
}

generateSitemapData();
