import { safeFetch } from './safe-fetch';

export interface AppTrackingEvent {
    type: 'signup_created' | 'store_connected' | 'first_freight_simulation' | 'first_whatsapp_message' | 'cockpit_viewed' | 'module_clicked';
    metadata?: Record<string, any>;
}

export function trackAppEvent({ type, metadata }: AppTrackingEvent) {
    if (typeof window === 'undefined') return;

    try {
        const payload = {
            type,
            metadata: metadata || undefined,
            ts: Date.now(),
        };

        const jsonStr = JSON.stringify(payload);
        const url = '/api/app/events';

        if (navigator.sendBeacon) {
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const queued = navigator.sendBeacon(url, blob);
            if (queued) return;
        }

        safeFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonStr,
            keepalive: true,
            maxRetries: 2,
            baseBackoffMs: 500
        }).catch(() => { });
    } catch (err) { }
}
