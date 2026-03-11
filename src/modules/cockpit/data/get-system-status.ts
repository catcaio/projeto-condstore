import type { CockpitRawData, SystemStatusItem } from './shared';
import { formatNumber, formatRelativeTime } from './shared';

function resolveHealthStatus(ok: boolean, degraded = false): SystemStatusItem['status'] {
    if (ok) {
        return 'healthy';
    }
    if (degraded) {
        return 'warning';
    }
    return 'critical';
}

export function getSystemStatusItems(rawData: CockpitRawData): SystemStatusItem[] {
    const systemPayload = rawData.systemStatusPayload;
    const diag = rawData.diagSnapshot;
    const failedWebhooks = rawData.derived.metricsSnapshot.failedWebhookEventsCount;

    const redisOk = diag?.redis === 'ok' && systemPayload?.infra.redis === 'ok';
    const dbOk = diag?.db === 'ok' && systemPayload?.infra.db === 'ok';
    const aiHealthy =
        Boolean(systemPayload?.ai.providerEnabled) &&
        Boolean(systemPayload?.ai.lastAskAt || systemPayload?.ai.lastEmbeddingAt);
    const webhookHealthy =
        Boolean(systemPayload?.whatsapp.twilioConfigured) && failedWebhooks === 0;

    return [
        {
            id: 'redis',
            label: 'Redis',
            status: resolveHealthStatus(redisOk, systemPayload?.infra.redis === 'degraded'),
            detail: redisOk
                ? 'Cache e filas respondendo dentro do baseline operacional.'
                : 'Redis degradado ou indisponivel no diagnostico interno.',
            source: 'diag interno + status infra',
        },
        {
            id: 'db',
            label: 'DB',
            status: resolveHealthStatus(dbOk, systemPayload?.infra.db === 'degraded'),
            detail: dbOk
                ? 'Banco respondendo nas consultas criticas do cockpit.'
                : 'Falha ou degradacao detectada nas leituras de persistencia.',
            source: 'diag interno + status infra',
        },
        {
            id: 'ai-provider',
            label: 'AI Provider',
            status: aiHealthy ? 'healthy' : systemPayload?.ai.providerEnabled ? 'warning' : 'critical',
            detail: systemPayload?.ai.providerEnabled
                ? `Ultimo ask ${systemPayload.ai.lastAskAt ? formatRelativeTime(systemPayload.ai.lastAskAt) : 'sem registro recente'} e embeddings ${systemPayload.ai.lastEmbeddingAt ? formatRelativeTime(systemPayload.ai.lastEmbeddingAt) : 'sem registro'}.`
                : 'Provider de IA nao habilitado para o tenant atual.',
            source: 'status de IA e knowledge',
        },
        {
            id: 'webhook',
            label: 'Webhook',
            status: webhookHealthy ? 'healthy' : failedWebhooks > 0 ? 'critical' : 'warning',
            detail: webhookHealthy
                ? `Ultimo inbound ${systemPayload?.whatsapp.lastInboundAt ? formatRelativeTime(systemPayload.whatsapp.lastInboundAt) : 'sem trafego recente'}.`
                : `${formatNumber(failedWebhooks)} falha(s) de webhook nas ultimas 24h${systemPayload?.whatsapp.outboundBlockedByFinops ? ' e outbound bloqueado por finops.' : '.'}`,
            source: 'status WhatsApp + eventos de webhook',
        },
    ];
}
