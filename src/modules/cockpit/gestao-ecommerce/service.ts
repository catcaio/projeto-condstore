import { z } from 'zod';
import {
    ecommerceRepository, type EcommerceReadRepository, type EcommerceStoredEvent,
    type EcommerceStoredProject, type EcommerceStoredTask,
} from './repository';
import {
    ECOMMERCE_FRONTS, ECOMMERCE_STATUS_LABELS, type EcommerceActor, type EcommerceActivity,
    type EcommerceCockpitSnapshot, type EcommerceFilters, type EcommerceProject, type EcommerceStatus, type EcommerceTask,
} from './types';

const nullableText = z.string().max(10000).nullable();
const nullableDate = z.string().datetime({ offset: true }).nullable();
const evidenceSchema = z.array(z.string().max(2000)).max(100);

export const ecommerceProjectMetadataSchema = z.object({
    module: z.literal('ecommerce'), version: z.literal(1), code: z.string().min(1).max(50),
    frontCode: z.enum(['F01', 'F02', 'F03', 'F04', 'F05', 'F06']), isDemo: z.boolean(),
    problem: nullableText, objective: nullableText, diagnosis: nullableText, hypothesis: nullableText, kpi: nullableText,
    responsible: z.string().max(255).nullable(), responsibleUserId: z.string().max(36).nullable(),
    assignedUserIds: z.array(z.string().min(1).max(36)).max(100), sharedForViewers: z.boolean(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']), startAt: nullableDate, expectedAt: nullableDate,
    nextMilestone: z.object({ title: z.string().min(1).max(1000), dueAt: nullableDate }).strict().nullable(),
    evidence: evidenceSchema, observedResult: nullableText, learning: nullableText,
    blockers: z.array(z.string().max(2000)).max(100), pendingDecisions: z.array(z.string().max(2000)).max(100),
    source: z.object({
        type: z.enum(['demonstration', 'clickup', 'manual']), externalId: z.string().max(255).nullable(),
        url: z.string().url().refine((value) => new URL(value).protocol === 'https:').nullable(), updatedAt: nullableDate,
    }).strict(),
}).strict().refine((value) => value.isDemo === (value.source.type === 'demonstration'), 'Inconsistent demonstration source');

export type EcommerceProjectMetadata = z.infer<typeof ecommerceProjectMetadataSchema>;

const activitySchema = z.object({
    occurredAt: z.string().datetime({ offset: true }), activityType: z.string().min(1).max(100),
    quantity: z.number().finite().nonnegative(), description: z.string().min(1).max(10000),
    evidence: evidenceSchema, responsible: z.string().max(255).nullable(), nextStep: nullableText,
}).strict();

const configurationSchema = z.object({
    version: z.literal(1), operationName: z.string().min(1).max(255),
    workspace: z.object({ id: z.string().regex(/^\d+$/), name: z.string().min(1).max(255) }).strict().nullable(),
    // Reserved storage contract; synchronization is implemented only after Gate 1 approval.
    syncHistory: z.array(z.object({
        id: z.string().min(1), startedAt: z.string().datetime({ offset: true }),
        completedAt: nullableDate, status: z.enum(['success', 'failed']),
    }).strict()).max(100),
}).strict();

function iso(value: Date | null): string | null {
    return value && Number.isFinite(value.getTime()) ? value.toISOString() : null;
}

function projectStatus(value: string): EcommerceStatus {
    if (!Object.hasOwn(ECOMMERCE_STATUS_LABELS, value)) throw new Error('Invalid ecommerce status');
    return value as EcommerceStatus;
}

function canReadProject(actor: EcommerceActor, project: EcommerceStoredProject, metadata: EcommerceProjectMetadata, tasks: EcommerceStoredTask[]): boolean {
    if (actor.role === 'admin' || actor.role === 'manager') return true;
    if (actor.role === 'viewer') return metadata.sharedForViewers;
    if (actor.role !== 'operator') return false;
    return project.createdBy === actor.userId || metadata.responsibleUserId === actor.userId ||
        metadata.assignedUserIds.includes(actor.userId) || tasks.some((task) => task.assigneeUserId === actor.userId);
}

function mapTask(task: EcommerceStoredTask, events: EcommerceStoredEvent[]): EcommerceTask {
    const completion = events.find((event) => event.taskId === task.id && event.eventType === 'task.completed');
    const completedAt = task.status === 'completed' && completion ? iso(completion.createdAt) : null;
    const evidence = events.filter((event) => event.taskId === task.id).flatMap((event) => {
        const payload = event.payloadJson as Record<string, unknown> | null;
        const parsed = evidenceSchema.safeParse(payload?.evidence);
        return parsed.success ? parsed.data : [];
    });
    return {
        id: task.id, title: task.title, description: task.description, status: projectStatus(task.status),
        responsible: task.assigneeUserId ? 'Responsável atribuído' : null,
        startAt: iso(task.startAt), expectedAt: iso(task.dueAt), completedAt, evidence: [...new Set(evidence)],
    };
}

function mapProject(project: EcommerceStoredProject, metadata: EcommerceProjectMetadata, tasks: EcommerceStoredTask[], events: EcommerceStoredEvent[]): EcommerceProject {
    if (!metadata.isDemo && tasks.some((task) => task.sourceType === 'demonstration')) {
        throw new Error('Inconsistent ecommerce demonstration data');
    }
    const taskIds = new Set(tasks.map((task) => task.id));
    const projectEvents = events.filter((event) => taskIds.has(event.taskId));
    const activities: EcommerceActivity[] = [];
    const seenActivityIds = new Set<string>();
    for (const event of projectEvents) {
        // A status/description change is history, never evidence of completed work.
        if (event.eventType !== 'activity.completed' || seenActivityIds.has(event.id)) continue;
        const parsed = activitySchema.safeParse(event.payloadJson);
        if (!parsed.success) throw new Error('Invalid ecommerce activity record');
        seenActivityIds.add(event.id);
        const { activityType, ...activity } = parsed.data;
        activities.push({ id: event.id, taskId: event.taskId, type: activityType, ...activity });
    }

    const deliverables = tasks.filter((task) => task.taskType === 'deliverable' && task.parentTaskId === null).map((task) => ({
        ...mapTask(task, projectEvents),
        tasks: tasks.filter((child) => child.parentTaskId === task.id && child.taskType === 'task').map((child) => mapTask(child, projectEvents)),
    }));
    const completed = deliverables.filter((deliverable) => deliverable.status === 'completed').length;
    const timestamps = [project.updatedAt, ...tasks.map((task) => task.updatedAt), ...projectEvents.map((event) => event.createdAt)]
        .map((value) => iso(value)).filter((value): value is string => value !== null);
    const updatedAt = timestamps.sort().at(-1);
    if (!updatedAt) throw new Error('Invalid ecommerce project timestamp');

    return {
        id: project.id, code: metadata.code, frontCode: metadata.frontCode, name: project.name, description: project.description,
        problem: metadata.problem, objective: metadata.objective, diagnosis: metadata.diagnosis,
        hypothesis: metadata.hypothesis, kpi: metadata.kpi, responsible: metadata.responsible, priority: metadata.priority,
        status: projectStatus(project.status), startAt: metadata.startAt, expectedAt: metadata.expectedAt,
        nextMilestone: metadata.nextMilestone, deliverables, activities,
        history: projectEvents.map((event) => {
            const payload = event.payloadJson as Record<string, unknown> | null;
            return {
                id: event.id, taskId: event.taskId, type: event.eventType, occurredAt: iso(event.createdAt) ?? updatedAt,
                description: typeof payload?.description === 'string' ? payload.description : 'Atualização registrada na origem',
            };
        }),
        evidence: metadata.evidence, observedResult: metadata.observedResult, learning: metadata.learning,
        blockers: metadata.blockers, pendingDecisions: metadata.pendingDecisions,
        progress: { completed, total: deliverables.length, percentage: deliverables.length ? Math.round(completed / deliverables.length * 100) : null },
        source: metadata.source, isDemo: metadata.isDemo, updatedAt,
    };
}

export async function getEcommerceCockpit(actor: EcommerceActor, filters: EcommerceFilters = {}, repository: EcommerceReadRepository = ecommerceRepository): Promise<EcommerceCockpitSnapshot> {
    if (!actor.tenantId.trim() || !actor.userId.trim() || !['admin', 'manager', 'operator', 'viewer'].includes(actor.role)) {
        throw new Error('Invalid ecommerce authorization context');
    }
    const tenantId = actor.tenantId;
    const storedProjects = (await repository.listProjects(tenantId)).filter((project) => project.tenantId === tenantId && project.archivedAt === null);
    const allProjectIds = storedProjects.map((project) => project.id);
    const [storedTasks, storedLists, spaces, storedConfig] = await Promise.all([
        repository.listTasks(tenantId, allProjectIds), repository.listLists(tenantId, allProjectIds),
        repository.listSpaces(tenantId, [...new Set(storedProjects.map((project) => project.spaceId))]), repository.getConfig(tenantId),
    ]);
    const projectIds = new Set(allProjectIds);
    const validLists = new Map(storedLists.filter((list) => list.tenantId === tenantId && projectIds.has(list.projectId)).map((list) => [list.id, list]));
    const tasks = storedTasks.filter((task) => task.tenantId === tenantId && task.archivedAt === null && projectIds.has(task.projectId) && validLists.get(task.listId)?.projectId === task.projectId);
    const rootDeliverables = new Map(tasks.filter((task) => task.taskType === 'deliverable' && task.parentTaskId === null).map((task) => [task.id, task]));
    const validTasks = tasks.filter((task) => rootDeliverables.has(task.id) || (task.taskType === 'task' && task.parentTaskId !== null &&
        rootDeliverables.get(task.parentTaskId)?.projectId === task.projectId && rootDeliverables.get(task.parentTaskId)?.listId === task.listId));
    const validSpaces = new Map(spaces.filter((space) => space.tenantId === tenantId && space.archivedAt === null).map((space) => [space.id, space]));

    const authorized: Array<{ project: EcommerceStoredProject; metadata: EcommerceProjectMetadata }> = [];
    for (const project of storedProjects) {
        const parsed = ecommerceProjectMetadataSchema.safeParse(project.ecommerceMetadata);
        if (!parsed.success) throw new Error('Invalid ecommerce project record');
        const metadata = parsed.data;
        if (validSpaces.get(project.spaceId)?.slug !== `ecommerce-${metadata.frontCode.toLowerCase()}`) continue;
        if (!canReadProject(actor, project, metadata, validTasks.filter((task) => task.projectId === project.id))) continue;
        if (filters.frontCode && metadata.frontCode !== filters.frontCode) continue;
        if (filters.projectId && project.id !== filters.projectId) continue;
        authorized.push({ project, metadata });
    }
    const authorizedIds = new Set(authorized.map(({ project }) => project.id));
    const authorizedTasks = validTasks.filter((task) => authorizedIds.has(task.projectId));
    const authorizedTaskIds = new Set(authorizedTasks.map((task) => task.id));
    const eventRecords = (await repository.listEvents(tenantId, [...authorizedTaskIds]))
        .filter((event) => event.tenantId === tenantId && authorizedTaskIds.has(event.taskId));
    const events = [...new Map(eventRecords.map((event) => [event.id, event])).values()];
    const projects = authorized.map(({ project, metadata }) => mapProject(project, metadata, authorizedTasks.filter((task) => task.projectId === project.id), events));
    // All summaries are derived only after per-resource authorization; demo records never inflate operational counts.
    const realProjects = projects.filter((project) => !project.isDemo);
    const active = (project: EcommerceProject) => !['completed', 'cancelled', 'backlog'].includes(project.status);
    const configuration = storedConfig?.tenantId === tenantId ? configurationSchema.parse(storedConfig.value) : null;
    const canSeeConfiguration = actor.role === 'admin' || actor.role === 'manager';
    const workspace = canSeeConfiguration ? configuration?.workspace : null;
    const lastUpdatedAt = projects.map((project) => project.updatedAt).sort().at(-1) ?? null;

    return {
        operationName: configuration?.operationName ?? 'Gestão de E-commerce',
        period: { from: null, to: null, label: 'Todos os registros disponíveis' },
        fronts: ECOMMERCE_FRONTS.map((front) => {
            const frontProjects = realProjects.filter((project) => project.frontCode === front.code);
            return {
                ...front, projectCount: frontProjects.length, demoProjectCount: projects.filter((project) => project.frontCode === front.code && project.isDemo).length,
                activeProjectCount: frontProjects.filter(active).length,
                completedDeliverables: frontProjects.reduce((count, project) => count + project.progress.completed, 0),
                totalDeliverables: frontProjects.reduce((count, project) => count + project.progress.total, 0),
            };
        }),
        projects,
        recentDeliveries: projects.flatMap((project) => project.deliverables.filter((deliverable) => deliverable.completedAt !== null)
            .map((deliverable) => ({ ...deliverable, projectId: project.id, projectCode: project.code, isDemo: project.isDemo })))
            .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')).slice(0, 10),
        nextMilestones: projects.flatMap((project) => project.nextMilestone ? [{ ...project.nextMilestone, projectId: project.id, projectCode: project.code, isDemo: project.isDemo }] : []),
        blockers: projects.flatMap((project) => project.blockers.map((description) => ({ description, projectId: project.id, projectCode: project.code, isDemo: project.isDemo }))),
        pendingDecisions: projects.flatMap((project) => project.pendingDecisions.map((description) => ({ description, projectId: project.id, projectCode: project.code, isDemo: project.isDemo }))),
        management: {
            activeProjects: realProjects.filter(active).length,
            completedDeliverables: realProjects.reduce((count, project) => count + project.progress.completed, 0),
            completedActivities: realProjects.reduce((count, project) => count + project.activities.length, 0),
        },
        lastUpdatedAt, lastSuccessfulSyncAt: null,
        integration: { status: workspace ? 'awaiting_verification' : 'not_configured', workspaceId: workspace?.id ?? null, workspaceName: workspace?.name ?? null, lastSuccessfulSyncAt: null },
        isDemo: projects.length > 0 && projects.every((project) => project.isDemo), permissions: { canConfigure: actor.role === 'admin' },
    };
}
