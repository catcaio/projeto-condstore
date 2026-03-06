import { SecurityEdgeEventRecord } from '@/drizzle/schema';

export interface SecurityIncidentBreach {
    reason: string;
    count: number;
    route: string | null;
    ipHash: string | null;
    windowStart: Date;
    windowEnd: Date;
}

export const ANOMALY_THRESHOLDS: Record<string, number> = {
    'invalid_jwt': 50,
    'tenant_mismatch': 20,
    'header_spoofing': 10,
    'payload_too_large': 15,
};

export function detectSecurityAnomalies(
    events: SecurityEdgeEventRecord[],
    windowStart: Date,
    windowEnd: Date
): SecurityIncidentBreach[] {
    const breaches: SecurityIncidentBreach[] = [];

    // Group events by reason
    const countsByReason = events.reduce((acc, event) => {
        if (!acc[event.reason]) {
            acc[event.reason] = {
                count: 0,
                routes: new Set<string>(),
                ipHashes: new Set<string>()
            };
        }
        acc[event.reason].count++;
        acc[event.reason].routes.add(event.route);
        if (event.ipHash) {
            acc[event.reason].ipHashes.add(event.ipHash);
        }
        return acc;
    }, {} as Record<string, { count: number, routes: Set<string>, ipHashes: Set<string> }>);

    for (const [reason, data] of Object.entries(countsByReason)) {
        const threshold = ANOMALY_THRESHOLDS[reason];
        if (threshold !== undefined && data.count > threshold) {

            // If there's a dominant route/ip, we attach it. Otherwise 'multiple' or null.
            const routeStr = data.routes.size === 1 ? Array.from(data.routes)[0] : 'multiple';
            const ipHashStr = data.ipHashes.size === 1 ? Array.from(data.ipHashes)[0] : (data.ipHashes.size > 1 ? 'multiple' : null);

            breaches.push({
                reason,
                count: data.count,
                route: routeStr,
                ipHash: ipHashStr,
                windowStart,
                windowEnd,
            });
        }
    }

    return breaches;
}
