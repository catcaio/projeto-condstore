'use server';

import { getSessionUser } from "../../../../infra/auth/session";
import { domineEventsRepository } from "../../../../infra/repositories/domine-events.repository";
import { processDomineEvent } from "../../../../domine/events/processor";

export async function runDomineProcessorAction() {
    const session = await getSessionUser();
    if (!session || (session.role !== 'admin' && session.role !== 'owner')) {
        return { ok: false, error: 'Unauthorized' };
    }

    // Call the same logic the worker would, natively server-side
    // We can just import and run it here to avoid HTTP loopback timeouts or token leakage overhead
    const events = await domineEventsRepository.fetchProcessableEvents(50, session.tenantId);
    let processed = 0;
    let failed = 0;

    for (const ev of events) {
        const locked = await domineEventsRepository.lockEvent(ev.id);
        if (locked) {
            try {
                await processDomineEvent(ev);
                processed++;
            } catch (e) {
                failed++;
            }
        }
    }

    return { ok: true, processed, failed };
}
