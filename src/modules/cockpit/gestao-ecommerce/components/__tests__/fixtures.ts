import { ECOMMERCE_FRONTS, type EcommerceCockpitSnapshot, type EcommerceProject } from '../../types';

export function projectFixture(overrides: Partial<EcommerceProject> = {}): EcommerceProject {
    return {
        id: '11111111-1111-4111-8111-111111111111', code: 'CAT-001', frontCode: 'F02',
        name: 'Otimização dos 100 anúncios prioritários', description: 'Projeto de demonstração identificado.',
        problem: 'Qualidade dos anúncios a avaliar.', objective: 'Padronizar a qualidade dos anúncios.',
        diagnosis: 'Diagnóstico ainda em construção.', hypothesis: 'Melhor conteúdo pode facilitar a decisão de compra.',
        kpi: 'Conversão — aguardando medição autorizada.', responsible: null, priority: 'high', status: 'planned',
        startAt: null, expectedAt: null, nextMilestone: { title: 'Concluir diagnóstico', dueAt: null },
        deliverables: [{
            id: '22222222-2222-4222-8222-222222222222', title: 'Diagnóstico dos anúncios prioritários',
            description: null, status: 'planned', responsible: null, startAt: null, expectedAt: null,
            completedAt: null, evidence: [], tasks: [],
        }],
        activities: [], history: [], evidence: [], observedResult: null, learning: null,
        blockers: [], pendingDecisions: [], progress: { completed: 0, total: 1, percentage: 0 },
        source: { type: 'demonstration', externalId: null, url: null, updatedAt: null },
        isDemo: true, updatedAt: '2026-10-31T01:00:00.000Z', ...overrides,
    };
}

export function snapshotFixture(overrides: Partial<EcommerceCockpitSnapshot> = {}): EcommerceCockpitSnapshot {
    return {
        operationName: 'Indiana · Gestão de E-commerce',
        period: { from: null, to: null, label: 'Todos os registros disponíveis' },
        fronts: ECOMMERCE_FRONTS.map(front => ({ ...front, projectCount: 0, demoProjectCount: 0, activeProjectCount: 0, completedDeliverables: 0, totalDeliverables: 0 })),
        projects: [], recentDeliveries: [], nextMilestones: [], blockers: [], pendingDecisions: [],
        management: { activeProjects: 0, completedDeliverables: 0, completedActivities: 0 },
        lastUpdatedAt: null, lastSuccessfulSyncAt: null,
        integration: { status: 'not_configured', workspaceId: null, workspaceName: null, lastSuccessfulSyncAt: null },
        isDemo: false, permissions: { canConfigure: false }, ...overrides,
    };
}
