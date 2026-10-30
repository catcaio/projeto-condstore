export const ECOMMERCE_FRONTS = [
    { code: 'F01', name: 'Operação', objective: 'Saúde das contas, pedidos, ocorrências e continuidade operacional' },
    { code: 'F02', name: 'Catálogo', objective: 'Criação, revisão, padronização e qualidade dos anúncios' },
    { code: 'F03', name: 'Comercial', objective: 'Precificação, margens, competitividade e oportunidades' },
    { code: 'F04', name: 'Performance', objective: 'Conversão, vendas, campanhas e resultados' },
    { code: 'F05', name: 'Expansão', objective: 'Avaliação de Shopee, Amazon e TikTok Shop' },
    { code: 'F06', name: 'Inteligência', objective: 'Análises de mercado, concorrentes, clientes e oportunidades' },
] as const;

export type EcommerceFrontCode = typeof ECOMMERCE_FRONTS[number]['code'];
export type EcommerceStatus = 'backlog' | 'planned' | 'in_progress' | 'in_validation' | 'completed' | 'blocked' | 'cancelled';
export const ECOMMERCE_STATUS_LABELS: Record<EcommerceStatus, string> = {
    backlog: 'Backlog', planned: 'Planejado', in_progress: 'Em andamento',
    in_validation: 'Em validação', completed: 'Concluído', blocked: 'Bloqueado', cancelled: 'Cancelado',
};

export interface EcommerceActor {
    tenantId: string;
    userId: string;
    role: 'admin' | 'manager' | 'operator' | 'viewer';
}

export interface EcommerceFilters {
    frontCode?: EcommerceFrontCode;
    projectId?: string;
}

export interface EcommerceConfigurationInput {
    operationName: string;
    workspace: {
        id: string;
        name: string;
    };
}

export interface EcommerceSource {
    type: 'demonstration' | 'clickup' | 'manual';
    externalId: string | null;
    url: string | null;
    updatedAt: string | null;
}

export interface EcommerceTask {
    id: string;
    title: string;
    description: string | null;
    status: EcommerceStatus;
    responsible: string | null;
    startAt: string | null;
    expectedAt: string | null;
    completedAt: string | null;
    evidence: string[];
}

export interface EcommerceDeliverable extends EcommerceTask {
    tasks: EcommerceTask[];
}

export interface EcommerceActivity {
    id: string;
    taskId: string;
    occurredAt: string;
    type: string;
    quantity: number;
    description: string;
    evidence: string[];
    responsible: string | null;
    nextStep: string | null;
}

export interface EcommerceHistoryEvent {
    id: string;
    taskId: string;
    type: string;
    occurredAt: string;
    description: string;
}

export interface EcommerceMilestone {
    title: string;
    dueAt: string | null;
}

export interface EcommerceProject {
    id: string;
    code: string;
    frontCode: EcommerceFrontCode;
    name: string;
    description: string | null;
    problem: string | null;
    objective: string | null;
    diagnosis: string | null;
    hypothesis: string | null;
    kpi: string | null;
    responsible: string | null;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: EcommerceStatus;
    startAt: string | null;
    expectedAt: string | null;
    nextMilestone: EcommerceMilestone | null;
    deliverables: EcommerceDeliverable[];
    activities: EcommerceActivity[];
    history: EcommerceHistoryEvent[];
    evidence: string[];
    observedResult: string | null;
    learning: string | null;
    blockers: string[];
    pendingDecisions: string[];
    progress: { completed: number; total: number; percentage: number | null };
    source: EcommerceSource;
    isDemo: boolean;
    updatedAt: string;
}

export interface EcommerceFront {
    code: EcommerceFrontCode;
    name: string;
    objective: string;
    projectCount: number;
    demoProjectCount: number;
    activeProjectCount: number;
    completedDeliverables: number;
    totalDeliverables: number;
}

export interface EcommerceIntegration {
    status: 'not_configured' | 'awaiting_verification';
    workspaceId: string | null;
    workspaceName: string | null;
    lastSuccessfulSyncAt: string | null;
}

export interface EcommerceCockpitSnapshot {
    operationName: string;
    period: { from: string | null; to: string | null; label: string };
    fronts: EcommerceFront[];
    projects: EcommerceProject[];
    recentDeliveries: Array<EcommerceDeliverable & { projectId: string; projectCode: string; isDemo: boolean }>;
    nextMilestones: Array<EcommerceMilestone & { projectId: string; projectCode: string; isDemo: boolean }>;
    blockers: Array<{ projectId: string; projectCode: string; description: string; isDemo: boolean }>;
    pendingDecisions: Array<{ projectId: string; projectCode: string; description: string; isDemo: boolean }>;
    management: { activeProjects: number; completedDeliverables: number; completedActivities: number };
    lastUpdatedAt: string | null;
    lastSuccessfulSyncAt: string | null;
    integration: EcommerceIntegration;
    isDemo: boolean;
    permissions: { canConfigure: boolean };
}
