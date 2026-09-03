import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
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

const activeIncidentRuns = new Map<string, string>(); // correlationKey -> executionId

export class FrankObserverService {
    /**
     * Captures an operational anomaly or telemetry event and streams it into the Frank execution state pipeline with deduplication.
     */
    async observeSignal(signal: SignalObservation): Promise<string> {
        const correlationKey = signal.correlationKey || `${signal.tenantId}:${signal.signalType}`;

        // Deduplication check: return existing execution if already active
        if (activeIncidentRuns.has(correlationKey)) {
            const existingExecutionId = activeIncidentRuns.get(correlationKey)!;
            const existingRunData = await frankExecutionStateService.getExecutionWithSteps(signal.tenantId, existingExecutionId);

            if (existingRunData && ['PENDING', 'RUNNING', 'PAUSED_HUMAN_APPROVAL'].includes(existingRunData.run.status)) {
                logger.info('Frank Observer deduplicated signal into active run', { correlationKey, existingExecutionId });
                return existingExecutionId;
            }

            // Remove terminal or stale run from active map
            activeIncidentRuns.delete(correlationKey);
        }

        logger.info('Frank Observer captured signal', {
            tenantId: signal.tenantId,
            signalType: signal.signalType,
            severity: signal.severity
        });

        // 1. Map domain safely to valid OperationalEventDomain
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

        // 2. Spawn a durable Frank Execution Run to investigate the signal
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

        // 3. Register initial investigation step
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

        activeIncidentRuns.set(correlationKey, run.executionId);
        return run.executionId;
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
