import { getDb } from '../../infra/db';
import { publicEvents } from '../../drizzle/schema';
import crypto from 'crypto';

interface LogPublicEventParams {
    anonId: string;
    event: string;
    path: string;
    props?: Record<string, unknown> | null;
    userAgent?: string;
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
            const db = await getDb();
            const eventId = crypto.randomUUID();

            const safeProps =
                params.props && Object.keys(params.props).length > 0
                    ? JSON.stringify(params.props)
                    : null;

            await db.insert(publicEvents).values({
                id: eventId,
                anonId: params.anonId,
                event: params.event,
                path: params.path,
                props: safeProps,
                userAgent: params.userAgent ?? null,
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
