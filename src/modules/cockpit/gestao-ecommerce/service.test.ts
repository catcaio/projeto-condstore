import { describe, expect, it, vi } from 'vitest';
import { getEcommerceCockpit, type EcommerceProjectMetadata } from './service';
import type { EcommerceActor } from './types';
import type {
    EcommerceReadRepository, EcommerceStoredEvent, EcommerceStoredList, EcommerceStoredProject,
    EcommerceStoredSpace, EcommerceStoredTask,
} from './repository';

const when = new Date('2026-10-30T12:00:00.000Z');
const metadata: EcommerceProjectMetadata = {
    module: 'ecommerce', version: 1, code: 'CAT-001', frontCode: 'F02', isDemo: false,
    problem: null, objective: 'Qualificar anúncios', diagnosis: null, hypothesis: null, kpi: null,
    responsible: null, responsibleUserId: null, assignedUserIds: [], sharedForViewers: false,
    priority: 'normal', startAt: null, expectedAt: null, nextMilestone: null,
    evidence: [], observedResult: null, learning: null, blockers: [], pendingDecisions: [],
    source: { type: 'manual', externalId: null, url: null, updatedAt: when.toISOString() },
};
function project(id: string, overrides: Partial<EcommerceStoredProject> = {}): EcommerceStoredProject {
    return {
        id, tenantId: 'tenant-a', spaceId: 'space', name: id, slug: id, description: null,
        ecommerceMetadata: { ...metadata, code: id }, visibility: 'private', status: 'in_progress', sortOrder: 0,
        createdBy: 'owner', createdAt: when, updatedAt: when, archivedAt: null, ...overrides,
    };
}
function task(id: string, projectId: string, overrides: Partial<EcommerceStoredTask> = {}): EcommerceStoredTask {
    return {
        id, tenantId: 'tenant-a', projectId, listId: `${projectId}-list`, parentTaskId: null,
        title: id, description: null, status: 'planned', priority: 'normal', assigneeUserId: null,
        reporterUserId: 'owner', dueAt: null, startAt: null, sortOrder: 0, sourceType: 'manual', sourceRef: null,
        taskType: 'deliverable', incidentSource: null, incidentSeverity: null, createdAt: when, updatedAt: when, archivedAt: null, ...overrides,
    };
}
function event(id: string, taskId: string, overrides: Partial<EcommerceStoredEvent> = {}): EcommerceStoredEvent {
    return {
        id, tenantId: 'tenant-a', taskId, actorUserId: 'owner', eventType: 'task.status_changed',
        payloadJson: { description: 'Status atualizado' }, createdAt: when, ...overrides,
    };
}
function repository(projects: EcommerceStoredProject[], tasks: EcommerceStoredTask[] = [], events: EcommerceStoredEvent[] = []): EcommerceReadRepository {
    return {
        listProjects: vi.fn().mockResolvedValue(projects), listTasks: vi.fn().mockResolvedValue(tasks),
        listLists: vi.fn().mockResolvedValue(projects.map((p): EcommerceStoredList => ({
            id: `${p.id}-list`, tenantId: p.tenantId, projectId: p.id, name: 'WBS', type: 'wbs', sortOrder: 0, createdAt: when, updatedAt: when,
        }))),
        listSpaces: vi.fn().mockResolvedValue([{
            id: 'space', tenantId: 'tenant-a', name: 'Catálogo', slug: 'ecommerce-f02', color: null, icon: null,
            createdAt: when, updatedAt: when, archivedAt: null,
        } satisfies EcommerceStoredSpace]),
        listEvents: vi.fn().mockResolvedValue(events), getConfig: vi.fn().mockResolvedValue(null),
    };
}
function actor(role: EcommerceActor['role'], userId = 'reader'): EcommerceActor {
    return { tenantId: 'tenant-a', userId, role };
}

describe('ecommerce cockpit authorization and truthful summaries', () => {
    it('returns six fronts and an honest empty snapshot without seeding', async () => {
        const snapshot = await getEcommerceCockpit(actor('manager'), {}, repository([]));
        expect(snapshot.fronts.map((front) => front.code)).toEqual(['F01', 'F02', 'F03', 'F04', 'F05', 'F06']);
        expect(snapshot.projects).toEqual([]);
        expect(snapshot.lastUpdatedAt).toBeNull();
        expect(snapshot.lastSuccessfulSyncAt).toBeNull();
        expect(snapshot.integration.status).toBe('not_configured');
        expect(snapshot.permissions.canConfigure).toBe(false);
    });

    it.each(['admin', 'manager'] as const)('lets %s read tenant resources but excludes foreign tenant data', async (role) => {
        const repo = repository([project('own'), project('foreign', { tenantId: 'tenant-b' })], [task('wbs', 'own'), task('foreign-wbs', 'own', { tenantId: 'tenant-b' })]);
        const snapshot = await getEcommerceCockpit(actor(role), {}, repo);
        expect(snapshot.projects.map((p) => p.id)).toEqual(['own']);
        expect(snapshot.projects[0].deliverables.map((d) => d.id)).toEqual(['wbs']);
        expect(snapshot.management.activeProjects).toBe(1);
        expect(repo.listTasks).toHaveBeenCalledWith('tenant-a', ['own']);
    });

    it('filters operator resources before project/task/event summaries', async () => {
        const projects = [
            project('created', { createdBy: 'reader' }), project('assigned', { ecommerceMetadata: { ...metadata, assignedUserIds: ['reader'] } }),
            project('task-assigned'), project('private'),
        ];
        const repo = repository(projects, [task('mine', 'task-assigned', { assigneeUserId: 'reader' }), task('hidden', 'private', { status: 'completed' })], [event('hidden-event', 'hidden')]);
        const snapshot = await getEcommerceCockpit(actor('operator'), {}, repo);
        expect(snapshot.projects.map((p) => p.id)).toEqual(['created', 'assigned', 'task-assigned']);
        expect(snapshot.management.activeProjects).toBe(3);
        expect(snapshot.management.completedDeliverables).toBe(0);
        expect(repo.listEvents).toHaveBeenCalledWith('tenant-a', ['mine']);
        expect(JSON.stringify(snapshot)).not.toContain('hidden');
    });

    it('only exposes explicitly shared projects to viewers, including on direct ID access', async () => {
        const repo = repository([project('shared', { ecommerceMetadata: { ...metadata, sharedForViewers: true } }), project('private')]);
        expect((await getEcommerceCockpit(actor('viewer'), {}, repo)).projects.map((p) => p.id)).toEqual(['shared']);
        const hidden = await getEcommerceCockpit(actor('viewer'), { projectId: 'private' }, repo);
        const missing = await getEcommerceCockpit(actor('viewer'), { projectId: 'missing' }, repo);
        expect(hidden).toEqual(missing);
    });

    it('never uses foreign parents or orphaned assigned tasks to grant access', async () => {
        const repo = repository([project('private')], [
            task('orphan', 'private', { taskType: 'task', parentTaskId: 'missing-parent', assigneeUserId: 'reader' }),
            task('wrong-list', 'private', { listId: 'foreign-list', assigneeUserId: 'reader' }),
        ]);
        expect((await getEcommerceCockpit(actor('operator'), {}, repo)).projects).toEqual([]);
    });

    it('excludes demonstration projects from operational counts', async () => {
        const repo = repository([project('demo', { ecommerceMetadata: { ...metadata, isDemo: true, source: { ...metadata.source, type: 'demonstration' } } })], [task('wbs', 'demo', { status: 'completed' })]);
        const snapshot = await getEcommerceCockpit(actor('manager'), {}, repo);
        expect(snapshot.isDemo).toBe(true);
        expect(snapshot.projects[0].progress).toEqual({ completed: 1, total: 1, percentage: 100 });
        expect(snapshot.management).toEqual({ activeProjects: 0, completedDeliverables: 0, completedActivities: 0 });
        expect(snapshot.fronts[1]).toMatchObject({ projectCount: 0, demoProjectCount: 1, completedDeliverables: 0 });
    });

    it('shows initial demonstration history without recording work or inflating operational counts', async () => {
        const description = 'Exemplo CAT-001 e EAP cadastrados para demonstração, sem execução ou resultado comercial.';
        const repo = repository([project('demo', {
            ecommerceMetadata: { ...metadata, isDemo: true, source: { ...metadata.source, type: 'demonstration' } },
        })], [task('wbs', 'demo', { sourceType: 'demonstration' })], [event('demo-created', 'wbs', {
            eventType: 'demo.seeded', payloadJson: { description },
        })]);
        const snapshot = await getEcommerceCockpit(actor('manager'), {}, repo);
        expect(snapshot.projects[0].history).toEqual([{
            id: 'demo-created', taskId: 'wbs', type: 'demo.seeded', occurredAt: when.toISOString(), description,
        }]);
        expect(snapshot.projects[0].activities).toEqual([]);
        expect(snapshot.recentDeliveries).toEqual([]);
        expect(snapshot.management).toEqual({ activeProjects: 0, completedDeliverables: 0, completedActivities: 0 });
    });

    it('counts only structured completed activities, deduplicates identity, and preserves status history', async () => {
        const completed = event('execution-1', 'wbs', {
            eventType: 'activity.completed', payloadJson: {
                occurredAt: '2026-10-29T14:00:00.000Z', activityType: 'review', quantity: 20,
                description: 'Anúncios revisados', evidence: ['Relatório de revisão'], responsible: null, nextStep: 'Medir resultados',
            },
        });
        const repo = repository([project('real')], [task('wbs', 'real')], [event('status-1', 'wbs'), event('description-1', 'wbs', { eventType: 'task.description_changed' }), completed, completed]);
        const snapshot = await getEcommerceCockpit(actor('manager'), {}, repo);
        expect(snapshot.management.completedActivities).toBe(1);
        expect(snapshot.projects[0].activities[0]).toMatchObject({ id: 'execution-1', quantity: 20, occurredAt: '2026-10-29T14:00:00.000Z' });
        expect(snapshot.projects[0].history).toHaveLength(3);
        expect(snapshot.projects[0].observedResult).toBeNull();
    });

    it('fails visibly on invalid records instead of fabricating fallback data', async () => {
        const repo = repository([project('bad', { ecommerceMetadata: { module: 'ecommerce' } })]);
        await expect(getEcommerceCockpit(actor('admin'), {}, repo)).rejects.toThrow('Invalid ecommerce project record');
    });

    it('refuses to count demonstration tasks under a project marked as operational', async () => {
        const repo = repository([project('real')], [task('demo-task', 'real', { sourceType: 'demonstration' })]);
        await expect(getEcommerceCockpit(actor('manager'), {}, repo)).rejects.toThrow('Inconsistent ecommerce demonstration data');
    });

    it('applies front/project filters after access checks', async () => {
        const repo = repository([project('real')]);
        expect((await getEcommerceCockpit(actor('manager'), { frontCode: 'F01' }, repo)).projects).toEqual([]);
        expect((await getEcommerceCockpit(actor('manager'), { frontCode: 'F02', projectId: 'real' }, repo)).projects).toHaveLength(1);
    });

    it('requires a recorded completion event before presenting a delivery as recent', async () => {
        const repo = repository([project('real')], [
            task('without-event', 'real', { status: 'completed' }), task('with-event', 'real', { status: 'completed' }),
        ], [event('completion', 'with-event', { eventType: 'task.completed', payloadJson: { evidence: ['Validação registrada'] } })]);
        const snapshot = await getEcommerceCockpit(actor('manager'), {}, repo);
        expect(snapshot.projects[0].progress).toEqual({ completed: 2, total: 2, percentage: 100 });
        expect(snapshot.recentDeliveries.map((delivery) => delivery.id)).toEqual(['with-event']);
        expect(snapshot.recentDeliveries[0].evidence).toEqual(['Validação registrada']);
        expect(snapshot.management.completedActivities).toBe(0);
    });
});
