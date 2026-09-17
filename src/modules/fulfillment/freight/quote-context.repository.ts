import { db } from '@/db/client';
import { freightSimulations, freightConfirmations } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Retrieves freight quotes and confirmations associated with a specific context.
 */
export async function getQuoteContext(tenantId: string, simulationId?: string, confirmationId?: string) {
    let simulation = null;
    let confirmation = null;

    if (simulationId) {
        const simRecs = await db
            .select()
            .from(freightSimulations)
            .where(
                and(
                    eq(freightSimulations.tenantId, tenantId),
                    eq(freightSimulations.id, simulationId)
                )
            )
            .limit(1);
        if (simRecs.length > 0) {
            simulation = simRecs[0];
        }
    }

    if (confirmationId) {
        const confRecs = await db
            .select()
            .from(freightConfirmations)
            .where(
                and(
                    eq(freightConfirmations.tenantId, tenantId),
                    eq(freightConfirmations.id, confirmationId)
                )
            )
            .limit(1);
        if (confRecs.length > 0) {
            confirmation = confRecs[0];
        }
    }

    return {
        simulation,
        confirmation,
    };
}
