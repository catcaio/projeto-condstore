import { getDb } from '../../infra/db';
import { publicEvents } from '../../drizzle/schema';
import crypto from 'crypto';
import type { AttributionSnapshot } from '../../infra/attribution/attribution.types';

interface LogPublicEventParams {
    tenantId: string;
    anonId: string;
    event: string;
    path: string;
    props?: Record<string, unknown> | null;
    userAgent?: string;
    attribution?: AttributionSnapshot | null;
}

export const analyticsService = {
    /**
     * Logs a public conversion event resiliently.
     * Any failure inside this function will be gracefully caught and logged
     * to the server console, without rejecting the Promise. This prevents
     * the tracking logic from breaking the main business flows.
     */
    async logEvent(params: LogPublicEventParams): Promise<void> {
        try {
            const tenantId = params.tenantId?.trim();
            if (!tenantId) {
                throw new Error('tenant_id is required to log public event');
            }

            const db = await getDb();
            const eventId = crypto.randomUUID();

            const safeProps =
                params.props && Object.keys(params.props).length > 0
                    ? JSON.stringify(params.props)
                    : null;

            await db.insert(publicEvents).values({
                id: eventId,
                tenantId,
                anonId: params.anonId,
                eventType: params.event,
                attributionId: params.attribution?.clickId ?? null,
                payloadJson: {
                    path: params.path,
                    props: params.props ?? null,
                    userAgent: params.userAgent ?? null,
                    utmSource: params.attribution?.utmSource ?? null,
                    utmMedium: params.attribution?.utmMedium ?? null,
                    utmCampaign: params.attribution?.utmCampaign ?? null,
                    utmTerm: params.attribution?.utmTerm ?? null,
                    utmContent: params.attribution?.utmContent ?? null,
                },
            });

        } catch (err) {
            // 🔥 Resiliência Total: swallowed error no server side
            console.error('[AnalyticsService] Erro silencioso ao gravar public event:', {
                error: err instanceof Error ? err.message : String(err),
                params
            });
        }
    }
};
