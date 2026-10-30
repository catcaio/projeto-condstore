import { createHash, randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import {
    governanceLists, governanceProjects, governanceSpaces, governanceTaskEvents, governanceTasks,
    tenantConfigurations, tenantEvents,
} from '@/drizzle/schema';
import { ECOMMERCE_FRONTS, type EcommerceActor, type EcommerceConfigurationInput } from './types';

export const ECOMMERCE_CONFIG_KEY = 'cockpit.gestao-ecommerce';
type DbExecutor = Awaited<ReturnType<typeof getDb>>;
export type EcommerceStoredProject = typeof governanceProjects.$inferSelect;
export type EcommerceStoredTask = typeof governanceTasks.$inferSelect;
export type EcommerceStoredEvent = typeof governanceTaskEvents.$inferSelect;
export type EcommerceStoredList = typeof governanceLists.$inferSelect;
export type EcommerceStoredSpace = typeof governanceSpaces.$inferSelect;
export type EcommerceStoredConfig = typeof tenantConfigurations.$inferSelect;

export interface EcommerceReadRepository {
    listProjects(tenantId: string): Promise<EcommerceStoredProject[]>;
    listTasks(tenantId: string, projectIds: string[]): Promise<EcommerceStoredTask[]>;
    listLists(tenantId: string, projectIds: string[]): Promise<EcommerceStoredList[]>;
    listSpaces(tenantId: string, spaceIds: string[]): Promise<EcommerceStoredSpace[]>;
    listEvents(tenantId: string, taskIds: string[]): Promise<EcommerceStoredEvent[]>;
    getConfig(tenantId: string): Promise<EcommerceStoredConfig | null>;
}

// Stable IDs make the explicitly requested demo repeatable, including concurrent requests.
export function ecommerceSeedId(tenantId: string, entity: string): string {
    return createHash('sha256').update(`gestao-ecommerce:${tenantId}:${entity}`).digest('hex').slice(0, 32);
}

export class EcommerceRepository implements EcommerceReadRepository {
    constructor(private readonly database: () => Promise<DbExecutor> = getDb) {}

    async listProjects(tenantId: string): Promise<EcommerceStoredProject[]> {
        const db = await this.database();
        return db.select().from(governanceProjects)
            .where(and(eq(governanceProjects.tenantId, tenantId), isNotNull(governanceProjects.ecommerceMetadata), isNull(governanceProjects.archivedAt)))
            .orderBy(asc(governanceProjects.sortOrder), asc(governanceProjects.id));
    }

    async listTasks(tenantId: string, projectIds: string[]): Promise<EcommerceStoredTask[]> {
        if (projectIds.length === 0) return [];
        const db = await this.database();
        return db.select().from(governanceTasks)
            .where(and(eq(governanceTasks.tenantId, tenantId), inArray(governanceTasks.projectId, projectIds), isNull(governanceTasks.archivedAt)))
            .orderBy(asc(governanceTasks.sortOrder), asc(governanceTasks.id));
    }

    async listLists(tenantId: string, projectIds: string[]): Promise<EcommerceStoredList[]> {
        if (projectIds.length === 0) return [];
        const db = await this.database();
        return db.select().from(governanceLists)
            .where(and(eq(governanceLists.tenantId, tenantId), inArray(governanceLists.projectId, projectIds)));
    }

    async listSpaces(tenantId: string, spaceIds: string[]): Promise<EcommerceStoredSpace[]> {
        if (spaceIds.length === 0) return [];
        const db = await this.database();
        return db.select().from(governanceSpaces)
            .where(and(eq(governanceSpaces.tenantId, tenantId), inArray(governanceSpaces.id, spaceIds), isNull(governanceSpaces.archivedAt)));
    }

    async listEvents(tenantId: string, taskIds: string[]): Promise<EcommerceStoredEvent[]> {
        if (taskIds.length === 0) return [];
        const db = await this.database();
        return db.select().from(governanceTaskEvents)
            .where(and(eq(governanceTaskEvents.tenantId, tenantId), inArray(governanceTaskEvents.taskId, taskIds)))
            .orderBy(desc(governanceTaskEvents.createdAt), desc(governanceTaskEvents.id));
    }

    async getConfig(tenantId: string): Promise<EcommerceStoredConfig | null> {
        const db = await this.database();
        const [config] = await db.select().from(tenantConfigurations)
            .where(and(eq(tenantConfigurations.tenantId, tenantId), eq(tenantConfigurations.key, ECOMMERCE_CONFIG_KEY))).limit(1);
        return config ?? null;
    }

    async configure(actor: EcommerceActor, input: EcommerceConfigurationInput): Promise<void> {
        if (actor.role !== 'admin') throw new Error('Forbidden');
        if (!actor.tenantId.trim() || actor.tenantId.length > 36 || !actor.userId.trim() || actor.userId.length > 36) {
            throw new Error('Invalid ecommerce authorization context');
        }
        const db = await this.database();
        const tenantId = actor.tenantId;
        await db.transaction(async (tx) => {
            const [current] = await tx.select().from(tenantConfigurations)
                .where(and(eq(tenantConfigurations.tenantId, tenantId), eq(tenantConfigurations.key, ECOMMERCE_CONFIG_KEY)))
                .limit(1).for('update');
            const currentValue = current?.value as { syncHistory?: unknown } | undefined;
            const value = {
                version: 1, operationName: input.operationName, workspace: input.workspace,
                syncHistory: Array.isArray(currentValue?.syncHistory) ? currentValue.syncHistory : [],
            };
            const now = new Date();
            await tx.insert(tenantConfigurations).values({
                id: ecommerceSeedId(tenantId, 'config'), tenantId, key: ECOMMERCE_CONFIG_KEY,
                category: 'operacao', value, createdBy: actor.userId, createdAt: now, updatedAt: now,
            }).onDuplicateKeyUpdate({ set: { value, createdBy: actor.userId, updatedAt: now } });
            await tx.insert(tenantEvents).values({
                id: randomUUID(), tenantId, type: 'ecommerce.configuration.updated',
                payload: JSON.stringify({ actorUserId: actor.userId, workspaceId: input.workspace.id }), createdAt: now,
            });
        });
    }

    async seedDemonstration(actor: EcommerceActor): Promise<{ projectId: string }> {
        if (actor.role !== 'admin') throw new Error('Forbidden');
        if (!actor.tenantId.trim() || actor.tenantId.length > 36 || !actor.userId.trim() || actor.userId.length > 36) {
            throw new Error('Invalid ecommerce authorization context');
        }
        const db = await this.database();
        const tenantId = actor.tenantId;
        const id = (entity: string) => ecommerceSeedId(tenantId, entity);
        const projectId = id('CAT-001');
        const now = new Date();

        await db.transaction(async (tx) => {
            for (const front of ECOMMERCE_FRONTS) {
                const spaceId = id(`front:${front.code}`);
                await tx.insert(governanceSpaces).values({
                    id: spaceId, tenantId, name: `${front.code} | ${front.name}`, slug: `ecommerce-${front.code.toLowerCase()}`,
                    createdAt: now, updatedAt: now,
                }).onDuplicateKeyUpdate({ set: { id: spaceId } });
            }

            await tx.insert(governanceProjects).values({
                id: projectId, tenantId, spaceId: id('front:F02'),
                name: 'Otimização dos 100 anúncios prioritários', slug: 'ecommerce-cat-001',
                description: 'Projeto de demonstração para apresentar a gestão dos anúncios prioritários. Não representa execução ou resultado comercial real.',
                ecommerceMetadata: {
                    module: 'ecommerce', version: 1, code: 'CAT-001', frontCode: 'F02', isDemo: true,
                    problem: 'Exemplo: necessidade de avaliar a qualidade dos anúncios prioritários.',
                    objective: 'Demonstrar diagnóstico, critérios, otimização e medição de resultados.',
                    diagnosis: null, hypothesis: 'Exemplo de hipótese a validar: melhorar a qualidade dos anúncios pode favorecer a conversão.',
                    kpi: 'Visitas, conversão, unidades vendidas e receita — indisponíveis nesta etapa',
                    responsible: null, responsibleUserId: null, assignedUserIds: [], sharedForViewers: false,
                    priority: 'normal', startAt: null, expectedAt: null,
                    nextMilestone: { title: 'Realizar diagnóstico dos anúncios prioritários', dueAt: null },
                    evidence: [], observedResult: null, learning: null, blockers: [], pendingDecisions: [],
                    source: { type: 'demonstration', externalId: null, url: null, updatedAt: now.toISOString() },
                },
                visibility: 'private', status: 'planned', createdBy: actor.userId, createdAt: now, updatedAt: now,
            }).onDuplicateKeyUpdate({ set: { id: projectId } });

            const listId = id('CAT-001:wbs');
            await tx.insert(governanceLists).values({
                id: listId, tenantId, projectId, name: 'EAP / WBS — demonstração', type: 'wbs', createdAt: now, updatedAt: now,
            }).onDuplicateKeyUpdate({ set: { id: listId } });

            const deliverables = [
                'Diagnóstico dos anúncios prioritários', 'Definição de critérios de qualidade',
                'Execução e validação das otimizações', 'Medição dos resultados e conclusão',
            ];
            for (const [position, title] of deliverables.entries()) {
                const taskId = id(`CAT-001:wbs:${position + 1}`);
                await tx.insert(governanceTasks).values({
                    id: taskId, tenantId, projectId, listId, title, description: 'Entregável de demonstração; execução ainda não registrada.',
                    status: 'planned', priority: 'normal', reporterUserId: actor.userId, sortOrder: position,
                    sourceType: 'demonstration', sourceRef: `CAT-001/WBS/${position + 1}`, taskType: 'deliverable',
                    createdAt: now, updatedAt: now,
                }).onDuplicateKeyUpdate({ set: { id: taskId } });
            }

            const configId = id('config');
            await tx.insert(tenantConfigurations).values({
                id: configId, tenantId, key: ECOMMERCE_CONFIG_KEY, category: 'operacao', createdBy: actor.userId,
                value: { version: 1, operationName: 'INDIANA | Gestão de E-commerce', workspace: null, syncHistory: [] },
                createdAt: now, updatedAt: now,
            }).onDuplicateKeyUpdate({ set: { key: ECOMMERCE_CONFIG_KEY } });

            const eventId = id('demo:created');
            await tx.insert(tenantEvents).values({
                id: eventId, tenantId, type: 'ecommerce.demo.created',
                payload: JSON.stringify({ projectId, actorUserId: actor.userId, isDemo: true }), createdAt: now,
            }).onDuplicateKeyUpdate({ set: { id: eventId } });
        });
        return { projectId };
    }
}

export const ecommerceRepository = new EcommerceRepository();
