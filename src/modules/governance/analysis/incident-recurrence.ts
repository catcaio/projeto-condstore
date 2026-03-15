import { db } from '@/db/client';
import { governanceTasks } from '@/drizzle/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';

export class IncidentRecurrenceDetector {
    
    /**
     * Checks if a recent incident meets the criteria to suggest a playbook creation.
     * Criteria: 3 or more incidents with the same incidentSource and >= 'medium' severity in the last 7 days.
     */
    async detectRecurrenceForPlaybookSuggestion(tenantId: string, currentIncidentId: string): Promise<{
        shouldSuggest: boolean;
        history: any[];
    }> {
        const [currentIncident] = await db.select()
            .from(governanceTasks)
            .where(
                and(
                    eq(governanceTasks.id, currentIncidentId),
                    eq(governanceTasks.tenantId, tenantId)
                )
            )
            .limit(1);

        if (!currentIncident) return { shouldSuggest: false, history: [] };
        if (currentIncident.taskType !== 'incident') return { shouldSuggest: false, history: [] };
        if (!currentIncident.incidentSource) return { shouldSuggest: false, history: [] };

        // We only care about medium, high, critical
        const relevantSeverities = ['medium', 'high', 'critical', 'urgent'];
        if (!relevantSeverities.includes(currentIncident.incidentSeverity || currentIncident.priority)) {
            return { shouldSuggest: false, history: [] };
        }

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const history = await db.select()
            .from(governanceTasks)
            .where(
                and(
                    eq(governanceTasks.tenantId, tenantId),
                    eq(governanceTasks.incidentSource, currentIncident.incidentSource),
                    gte(governanceTasks.createdAt, sevenDaysAgo)
                )
            );

        // Filter valid severities manually if DB constraints differ, though usually priority is sufficient
        const validHistory = history.filter(h => 
            relevantSeverities.includes(h.incidentSeverity || h.priority)
        );

        if (validHistory.length >= 3) {
            return {
                shouldSuggest: true,
                history: validHistory,
            };
        }

        return { shouldSuggest: false, history: [] };
    }
}

export const incidentRecurrenceDetector = new IncidentRecurrenceDetector();
