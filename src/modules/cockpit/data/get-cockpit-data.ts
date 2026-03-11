import {
    cockpitActionQueue,
    cockpitAlerts,
    cockpitEvents,
    cockpitMetrics,
    cockpitShortcuts,
    cockpitSystemStatus,
} from '@/modules/cockpit/mock-data';
import { buildCockpitAlerts } from './get-cockpit-alerts';
import { getCockpitEvents } from './get-cockpit-events';
import { getCockpitMetrics } from './get-cockpit-metrics';
import { getCockpitQueues } from './get-cockpit-queues';
import { getCockpitShortcuts } from './get-cockpit-shortcuts';
import { getSystemStatusItems } from './get-system-status';
import type { CockpitDataBundle } from './shared';
import { loadCockpitRawData, resolveCockpitRequestContext } from './shared';

export async function getCockpitData(): Promise<CockpitDataBundle> {
    const context = await resolveCockpitRequestContext();

    if (!context) {
        return {
            metrics: cockpitMetrics,
            alerts: cockpitAlerts,
            events: cockpitEvents,
            queue: cockpitActionQueue,
            systemStatus: cockpitSystemStatus,
            shortcuts: cockpitShortcuts,
            meta: {
                source: 'fallback',
                generatedAt: new Date().toISOString(),
                partialBlocks: ['session'],
                fallbackReason: 'tenant_context_missing',
            },
        };
    }

    try {
        const rawData = await loadCockpitRawData(context);
        const systemStatus = getSystemStatusItems(rawData);

        return {
            metrics: getCockpitMetrics(rawData),
            alerts: buildCockpitAlerts({
                metricsSnapshot: rawData.derived.metricsSnapshot,
                routeHints: rawData.derived.routeHints,
                systemStatus,
            }),
            events: getCockpitEvents(rawData),
            queue: getCockpitQueues(rawData),
            systemStatus,
            shortcuts: getCockpitShortcuts(rawData),
            meta: {
                source: 'real',
                generatedAt: rawData.generatedAt,
                partialBlocks: rawData.partialBlocks,
                tenantId: rawData.context.tenantId,
            },
        };
    } catch {
        return {
            metrics: cockpitMetrics,
            alerts: cockpitAlerts,
            events: cockpitEvents,
            queue: cockpitActionQueue,
            systemStatus: cockpitSystemStatus,
            shortcuts: cockpitShortcuts,
            meta: {
                source: 'fallback',
                generatedAt: new Date().toISOString(),
                partialBlocks: ['cockpit_data'],
                fallbackReason: 'cockpit_data_query_failed',
                tenantId: context.tenantId,
            },
        };
    }
}
