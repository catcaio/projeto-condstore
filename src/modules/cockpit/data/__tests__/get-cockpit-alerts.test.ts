import { describe, expect, it } from 'vitest';
import { buildCockpitAlerts } from '../get-cockpit-alerts';

describe('buildCockpitAlerts', () => {
    const routeHints = {
        conversationsHref: '/conversas?status=nova',
        ordersHref: '/pedidos?status=em-analise',
        logisticsHref: '/logistica?status=simulado',
        exceptionsHref: '/logistica?excecao=true',
        simulatorHref: '/logistica/simulador',
        metricsHref: '/metricas',
    };

    it('returns actionable alerts when backlog and failures exist', () => {
        const alerts = buildCockpitAlerts({
            metricsSnapshot: {
                activeConversationCount: 22,
                unansweredConversationCount: 11,
                processingOrderCount: 9,
                pendingOrdersCount: 6,
                simulationsToday: 14,
                pendingFreightCount: 4,
                errorsAndExceptions: 7,
                activeIncidentCount: 1,
                failedDomineEventsCount: 2,
                failedWebhookEventsCount: 4,
                criticalSystemCount: 1,
            },
            routeHints,
            systemStatus: [
                {
                    id: 'webhook',
                    label: 'Webhook',
                    status: 'critical',
                    detail: 'Falhas recorrentes em integracao.',
                },
            ],
        });

        expect(alerts).toHaveLength(4);
        expect(alerts[0]).toMatchObject({
            id: 'integration-failure',
            priority: 'critical',
            href: '/logistica?excecao=true',
        });
        expect(alerts.some((alert) => alert.id === 'conversation-backlog')).toBe(true);
    });

    it('returns a safe info alert when operation is clear', () => {
        const alerts = buildCockpitAlerts({
            metricsSnapshot: {
                activeConversationCount: 0,
                unansweredConversationCount: 0,
                processingOrderCount: 0,
                pendingOrdersCount: 0,
                simulationsToday: 0,
                pendingFreightCount: 0,
                errorsAndExceptions: 0,
                activeIncidentCount: 0,
                failedDomineEventsCount: 0,
                failedWebhookEventsCount: 0,
                criticalSystemCount: 0,
            },
            routeHints,
            systemStatus: [
                {
                    id: 'db',
                    label: 'DB',
                    status: 'healthy',
                    detail: 'Sem degradacao.',
                },
            ],
        });

        expect(alerts).toEqual([
            expect.objectContaining({
                id: 'no-critical-alerts',
                priority: 'info',
                href: '/metricas',
            }),
        ]);
    });
});
