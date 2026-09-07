import { randomUUID } from 'crypto';
import { logger } from '@/infra/logger';
import {
    FrankDagPlan,
    FrankDagSnapshot,
    FrankDagTask,
    FrankDagTransitionEvent,
} from './frank-dag.types';
import { FrankPersistenceError } from '../frank-execution-state.service';

const memorySnapshots = new Map<string, FrankDagSnapshot>(); // key: `${tenantId}:${dagId}`
const memoryEvents = new Map<string, FrankDagTransitionEvent[]>(); // key: `${tenantId}:${dagId}`

export class FrankDagStateService {
    private isProductionMode(): boolean {
        return process.env.NODE_ENV === 'production';
    }

    private async getDbSafe() {
        if (!process.env.DATABASE_URL) return null;
        try {
            const { getDb } = await import('@/infra/db');
            return await getDb();
        } catch (err) {
            if (this.isProductionMode()) {
                throw new FrankPersistenceError('Database connection unavailable in production', err);
            }
            return null;
        }
    }

    /**
     * Converts a live FrankDagPlan to a serializable FrankDagSnapshot.
     */
    public planToSnapshot(plan: FrankDagPlan): FrankDagSnapshot {
        const tasksRecord: Record<string, FrankDagTask> = {};
        for (const [taskId, task] of plan.tasks.entries()) {
            tasksRecord[taskId] = { ...task };
        }

        return {
            dagId: plan.dagId,
            version: plan.version,
            tenantId: plan.tenantId,
            title: plan.title,
            executionRunId: plan.executionRunId,
            status: plan.status,
            predecessorFailurePolicy: plan.predecessorFailurePolicy,
            tasks: tasksRecord,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt,
            startedAt: plan.startedAt,
            completedAt: plan.completedAt,
            errorMsg: plan.errorMsg,
        };
    }

    /**
     * Reconstructs a live FrankDagPlan from a FrankDagSnapshot.
     */
    public snapshotToPlan(snapshot: FrankDagSnapshot): FrankDagPlan {
        const taskMap = new Map<string, FrankDagTask>();
        for (const taskId in snapshot.tasks) {
            taskMap.set(taskId, { ...snapshot.tasks[taskId] });
        }

        return {
            dagId: snapshot.dagId,
            version: snapshot.version,
            tenantId: snapshot.tenantId,
            title: snapshot.title,
            executionRunId: snapshot.executionRunId,
            status: snapshot.status,
            predecessorFailurePolicy: snapshot.predecessorFailurePolicy,
            tasks: taskMap,
            createdAt: snapshot.createdAt,
            updatedAt: snapshot.updatedAt,
            startedAt: snapshot.startedAt,
            completedAt: snapshot.completedAt,
            errorMsg: snapshot.errorMsg,
        };
    }

    /**
     * Persists snapshot of DAG plan state.
     */
    public async savePlanSnapshot(tenantId: string, plan: FrankDagPlan): Promise<FrankDagSnapshot> {
        if (!tenantId || tenantId !== plan.tenantId) {
            throw new Error(`Cross-tenant DAG persistence violation: tenant [${tenantId}] !== plan tenant [${plan.tenantId}].`);
        }

        const snapshot = this.planToSnapshot(plan);
        const key = `${tenantId}:${plan.dagId}`;
        const isProd = this.isProductionMode();
        let persistedInDb = false;

        const db = await this.getDbSafe();
        if (db) {
            try {
                const { operationalEvents } = await import('@/drizzle/schema');
                await db.insert(operationalEvents).values({
                    id: randomUUID(),
                    tenantId,
                    eventDomain: 'OPERATIONS',
                    eventType: 'frank_dag_snapshot',
                    entityId: plan.dagId,
                    payload: snapshot as unknown as Record<string, unknown>,
                    createdAt: new Date(),
                });
                persistedInDb = true;
            } catch (err) {
                if (isProd) {
                    logger.error('CRITICAL: DB insert failed for Frank DAG snapshot in production', err as Error, { tenantId, dagId: plan.dagId });
                    throw new FrankPersistenceError('Failed to persist DAG snapshot to DB in production', err);
                }
                logger.warn('Failed DB insert for DAG snapshot, using memory fallback', { tenantId, dagId: plan.dagId, err });
            }
        }

        if (!persistedInDb && isProd) {
            throw new FrankPersistenceError('DATABASE_URL missing or DB unavailable in production for DAG snapshot');
        }

        memorySnapshots.set(key, snapshot);
        logger.info('Frank DAG plan snapshot saved', { tenantId, dagId: plan.dagId, version: plan.version, status: plan.status });

        return snapshot;
    }

    /**
     * Retrieves snapshot of DAG plan state with strict tenant isolation.
     */
    public async getPlanSnapshot(tenantId: string, dagId: string): Promise<FrankDagSnapshot | null> {
        if (!tenantId || !dagId) return null;

        const key = `${tenantId}:${dagId}`;
        const db = await this.getDbSafe();

        if (db) {
            try {
                const { operationalEvents } = await import('@/drizzle/schema');
                const { eq, and, desc } = await import('drizzle-orm');

                const [latestEvent] = await db.select().from(operationalEvents)
                    .where(and(
                        eq(operationalEvents.tenantId, tenantId),
                        eq(operationalEvents.eventType, 'frank_dag_snapshot'),
                        eq(operationalEvents.entityId, dagId)
                    ))
                    .orderBy(desc(operationalEvents.createdAt))
                    .limit(1);

                if (latestEvent && latestEvent.payload) {
                    const dbSnapshot = latestEvent.payload as unknown as FrankDagSnapshot;
                    if (dbSnapshot.tenantId === tenantId) {
                        return dbSnapshot;
                    }
                }
            } catch (err) {
                logger.warn('Failed querying DAG snapshot from DB, checking memory store', { tenantId, dagId, err });
            }
        }

        const memSnapshot = memorySnapshots.get(key);
        if (memSnapshot) {
            if (memSnapshot.tenantId !== tenantId) {
                return null;
            }
            return memSnapshot;
        }

        return null;
    }

    /**
     * Records transition event for audit trail.
     */
    public async recordTransitionEvent(event: FrankDagTransitionEvent): Promise<void> {
        const { tenantId, dagId } = event;
        const key = `${tenantId}:${dagId}`;
        const isProd = this.isProductionMode();
        let persistedInDb = false;

        const db = await this.getDbSafe();
        if (db) {
            try {
                const { operationalEvents } = await import('@/drizzle/schema');
                await db.insert(operationalEvents).values({
                    id: event.eventId || randomUUID(),
                    tenantId,
                    eventDomain: 'OPERATIONS',
                    eventType: 'frank_dag_transition',
                    entityId: dagId,
                    payload: event as unknown as Record<string, unknown>,
                    createdAt: new Date(event.timestamp),
                });
                persistedInDb = true;
            } catch (err) {
                if (isProd) {
                    logger.error('CRITICAL: DB insert failed for Frank DAG transition in production', err as Error, { tenantId, dagId });
                    throw new FrankPersistenceError('Failed to persist DAG transition to DB in production', err);
                }
            }
        }

        if (!persistedInDb && isProd) {
            throw new FrankPersistenceError('DATABASE_URL missing or DB unavailable in production for DAG transition');
        }

        let events = memoryEvents.get(key);
        if (!events) {
            events = [];
            memoryEvents.set(key, events);
        }
        events.push(event);

        logger.info('Frank DAG transition event recorded', {
            tenantId,
            dagId,
            taskId: event.taskId,
            from: event.fromStatus,
            to: event.toStatus,
            reason: event.reason,
        });
    }

    /**
     * Retrieves all recorded transition events for a DAG plan with tenant isolation.
     */
    public async getTransitionEvents(tenantId: string, dagId: string): Promise<FrankDagTransitionEvent[]> {
        if (!tenantId || !dagId) return [];

        const key = `${tenantId}:${dagId}`;
        const db = await this.getDbSafe();

        if (db) {
            try {
                const { operationalEvents } = await import('@/drizzle/schema');
                const { eq, and, asc } = await import('drizzle-orm');

                const rows = await db.select().from(operationalEvents)
                    .where(and(
                        eq(operationalEvents.tenantId, tenantId),
                        eq(operationalEvents.eventType, 'frank_dag_transition'),
                        eq(operationalEvents.entityId, dagId)
                    ))
                    .orderBy(asc(operationalEvents.createdAt));

                if (rows.length > 0) {
                    return rows.map(r => r.payload as unknown as FrankDagTransitionEvent)
                        .filter(e => e.tenantId === tenantId);
                }
            } catch (err) {
                logger.warn('Failed querying DAG transitions from DB, checking memory store', { tenantId, dagId, err });
            }
        }

        const events = memoryEvents.get(key) || [];
        return events.filter(e => e.tenantId === tenantId);
    }

    /**
     * Reconstructs a live FrankDagPlan from persisted state.
     */
    public async reconstructPlanFromSnapshot(tenantId: string, dagId: string): Promise<FrankDagPlan | null> {
        const snapshot = await this.getPlanSnapshot(tenantId, dagId);
        if (!snapshot) return null;
        return this.snapshotToPlan(snapshot);
    }

    /**
     * Utility method to clear memory store (used in tests).
     */
    public resetMemoryStore(): void {
        memorySnapshots.clear();
        memoryEvents.clear();
    }
}

export const frankDagStateService = new FrankDagStateService();
