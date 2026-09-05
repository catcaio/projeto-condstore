import { publishOperationalEvent, subscribeOperationalEvent, type PublishOperationalEventInput } from '@/lib/events/operational-event-bus';
import { frankExecutionStateService } from './frank-execution-state.service';
import { getDb } from '@/infra/db';
import { operationalEvents } from '@/drizzle/schema';
import { eq, and, gte } from 'drizzle-orm';
import { logger } from '@/infra/logger';

export interface SignalObservation {
    tenantId: string;
    signalType: string;
    domain: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    summary: string;
    evidence: Record<string, unknown>;
    correlationKey?: string;
}

export interface SupervisorHealthStatus {
    status: 'ACTIVE' | 'PAUSED' | 'DEGRADED';
    active: boolean;
    lastObservationAt: Date | null;
    lastEvent: string | null;
    lastEventAt: Date | null;
    lastExecutionId: string | null;
    lastFailure: string | null;
    lastFailureAt: Date | null;
    failuresCount: number;
    totalSignalsObserved: number;
    activeIncidentsCount: number;
    nextCycleAt: Date | null;
}

const activeIncidentRuns = new Map<string, string>(); // correlationKey -> executionId
const CYCLE_INTERVAL_MS = 60 * 1000; // 1 minute cycle SLA

export class FrankObserverService {
    private active = true;
    private lastObservationAt: Date | null = null;
    private lastEvent: string | null = null;
    private lastEventAt: Date | null = null;
    private lastExecutionId: string | null = null;
    private lastFailure: string | null = null;
    private lastFailureAt: Date | null = null;
    private failuresCount = 0;
    private totalSignalsObserved = 0;
    private listenerSubscribed = false;

    constructor() {
        this.initTelemetryListener();
    }

    private initTelemetryListener() {
        if (this.listenerSubscribed) return;
        this.listenerSubscribed = true;

        subscribeOperationalEvent((event: PublishOperationalEventInput) => {
            if (!this.active) return;

            // Prevent recursion: ignore internal events published by Frank
            if (event.eventType.startsWith('frank_observed_') || event.eventType.startsWith('frank_post_deploy_')) {
                return;
            }

            this.lastEvent = `${event.eventDomain}:${event.eventType}`;
            this.lastEventAt = new Date();

            const eventTypeLower = event.eventType.toLowerCase();
            const isAnomaly =
                eventTypeLower.includes('fail') ||
                eventTypeLower.includes('error') ||
                eventTypeLower.includes('timeout') ||
                eventTypeLower.includes('spike') ||
                eventTypeLower.includes('degraded') ||
                eventTypeLower.includes('drop');

            if (isAnomaly) {
                const severity =
                    eventTypeLower.includes('critical') || eventTypeLower.includes('spike')
                        ? 'CRITICAL'
                        : eventTypeLower.includes('error') || eventTypeLower.includes('fail')
                        ? 'HIGH'
                        : 'MEDIUM';

                void this.observeSignal({
                    tenantId: event.tenantId,
                    signalType: event.eventType,
                    domain: event.eventDomain,
                    severity,
                    summary: `Anomalia detectada em tempo real: ${event.eventType}`,
                    evidence: { eventId: event.entityId, payload: event.payload || {} }
                }).catch((err: any) => {
                    this.failuresCount++;
                    this.lastFailure = err?.message || 'Failed processing real-time telemetry signal';
                    this.lastFailureAt = new Date();
                    logger.error('Failed processing real-time telemetry signal in FrankObserver', err as Error, {
                        tenantId: event.tenantId,
                        eventType: event.eventType
                    });
                });
            }
        });
    }

    public getSupervisorHealthStatus(tenantId?: string): SupervisorHealthStatus {
        const nextCycleAt = this.lastObservationAt ? new Date(this.lastObservationAt.getTime() + CYCLE_INTERVAL_MS) : new Date();

        let activeIncidentsCount = activeIncidentRuns.size;
        if (tenantId) {
            activeIncidentsCount = Array.from(activeIncidentRuns.keys()).filter((k) => k.startsWith(`${tenantId}:`)).length;
        }

        const status = !this.active ? 'PAUSED' : this.failuresCount > 5 ? 'DEGRADED' : 'ACTIVE';

        return {
            status,
            active: this.active,
            lastObservationAt: this.lastObservationAt,
            lastEvent: this.lastEvent,
            lastEventAt: this.lastEventAt,
            lastExecutionId: this.lastExecutionId,
            lastFailure: this.lastFailure,
            lastFailureAt: this.lastFailureAt,
            failuresCount: this.failuresCount,
            totalSignalsObserved: this.totalSignalsObserved,
            activeIncidentsCount,
            nextCycleAt,
        };
    }

    /**
     * Captures an operational anomaly or telemetry event and streams it into the Frank execution state pipeline with durable DB-backed deduplication.
     */
    async observeSignal(signal: SignalObservation): Promise<string> {
        this.totalSignalsObserved++;
        this.lastEvent = `${signal.domain}:${signal.signalType}`;
        this.lastEventAt = new Date();

        const correlationKey = signal.correlationKey || `${signal.tenantId}:${signal.signalType}`;

        // 1. In-memory & DB-backed deduplication check
        if (activeIncidentRuns.has(correlationKey)) {
            const existingExecutionId = activeIncidentRuns.get(correlationKey)!;
            const existingRunData = await frankExecutionStateService.getExecutionWithSteps(signal.tenantId, existingExecutionId);

            if (existingRunData && ['PENDING', 'RUNNING', 'PAUSED_HUMAN_APPROVAL'].includes(existingRunData.run.status)) {
                logger.info('Frank Observer deduplicated signal into active run (memory)', { correlationKey, existingExecutionId });
                return existingExecutionId;
            }

            activeIncidentRuns.delete(correlationKey);
        }

        // DB recovery check for active execution run matching tenantId & signalType
        const activeRuns = await frankExecutionStateService.recoverActiveExecutions(signal.tenantId);
        const existingRun = activeRuns.find((r) => {
            const ctx = (r.contextJson as any) || {};
            return ctx.signalType === signal.signalType;
        });

        if (existingRun) {
            activeIncidentRuns.set(correlationKey, existingRun.executionId);
            logger.info('Frank Observer deduplicated signal into active run (DB recovered)', { correlationKey, existingExecutionId: existingRun.executionId });
            return existingRun.executionId;
        }

        logger.info('Frank Observer captured signal', {
            tenantId: signal.tenantId,
            signalType: signal.signalType,
            severity: signal.severity
        });

        // 2. Map domain safely to valid OperationalEventDomain
        const validDomains = ['ACQUISITION', 'CONVERSION', 'OPERATIONS', 'REVENUE', 'RETENTION'];
        const domainUpper = signal.domain.toUpperCase();
        const mappedDomain = validDomains.includes(domainUpper) ? (domainUpper as any) : 'OPERATIONS';

        // Publish to operational event bus
        void publishOperationalEvent({
            tenantId: signal.tenantId,
            eventType: `frank_observed_${signal.signalType}`,
            eventDomain: mappedDomain,
            payload: {
                severity: signal.severity,
                summary: signal.summary,
                evidence: signal.evidence,
            }
        });

        // 3. Spawn a durable Frank Execution Run to investigate the signal
        const run = await frankExecutionStateService.createRun({
            tenantId: signal.tenantId,
            title: `Investigação [${signal.signalType}]: ${signal.summary}`,
            triggerSource: 'OBSERVER',
            autonomyLevel: signal.severity === 'CRITICAL' || signal.severity === 'HIGH' ? 'EXECUTE_GUARDED' : 'OBSERVE',
            contextJson: {
                signalType: signal.signalType,
                domain: signal.domain,
                severity: signal.severity,
                evidence: signal.evidence,
            }
        });

        // 4. Register initial investigation step
        await frankExecutionStateService.addStep({
            executionRunId: run.id,
            tenantId: signal.tenantId,
            stepNumber: 1,
            stepName: 'Consolidar Evidências e Contexto do Sinal',
            actionType: 'ANALYZE_SIGNAL',
            riskClass: 'SAFE',
            requiresHumanApproval: false,
            inputPayload: signal.evidence
        });

        this.lastExecutionId = run.executionId;
        this.lastObservationAt = new Date();
        activeIncidentRuns.set(correlationKey, run.executionId);
        return run.executionId;
    }

    /**
     * Active observation cycle for background workers or scheduled triggers.
     */
    async runSupervisorObservationCycle(tenantId: string, minutesBack: number = 15): Promise<{ signalsFound: number; activeIncidents: number }> {
        this.lastObservationAt = new Date();
        let signalsFound = 0;

        try {
            signalsFound = await this.scanRecentSystemEvents(tenantId, minutesBack);
        } catch (err: any) {
            this.failuresCount++;
            this.lastFailure = err?.message || 'Failed observation cycle';
            this.lastFailureAt = new Date();
            logger.error('Failed observation cycle in FrankObserver', err as Error, { tenantId });
        }

        const activeIncidents = Array.from(activeIncidentRuns.keys()).filter((k) => k.startsWith(`${tenantId}:`)).length;
        return { signalsFound, activeIncidents };
    }

    /**
     * Active polling method for background workers to scan recent high-risk system events.
     */
    async scanRecentSystemEvents(tenantId: string, minutesBack: number = 15): Promise<number> {
        const db = await getDb();
        if (!db) return 0;

        const since = new Date(Date.now() - minutesBack * 60 * 1000);

        try {
            const recentEvents = await db.select().from(operationalEvents)
                .where(and(
                    eq(operationalEvents.tenantId, tenantId),
                    gte(operationalEvents.createdAt, since)
                ));

            let signalsFound = 0;
            for (const ev of recentEvents) {
                const payload = (ev.payload as Record<string, unknown>) || {};
                if (ev.eventType.includes('error') || ev.eventType.includes('failed') || payload.status === 'failed') {
                    await this.observeSignal({
                        tenantId,
                        signalType: ev.eventType,
                        domain: ev.eventDomain,
                        severity: 'HIGH',
                        summary: `Falha detectada no evento ${ev.eventType}`,
                        evidence: { eventId: ev.id, payload: ev.payload }
                    });
                    signalsFound++;
                }
            }

            return signalsFound;
        } catch (err: any) {
            logger.error('Failed scanning recent system events in FrankObserver', err, { tenantId });
            return 0;
        }
    }
}

export const frankObserverService = new FrankObserverService();
