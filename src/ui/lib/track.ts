import { safeFetch } from './safe-fetch';

export interface TrackingEvent {
    type: 'view_section' | 'click_cta' | 'roi_change' | 'entry_start' | 'entry_success'
    | 'cotacao_result_viewed' | 'cotacao_card_clicked' | 'cotacao_filter_changed' | 'cotacao_upgrade_cta_clicked';
    page: string;
    section: string;
    element?: string;
    metadata?: Record<string, any>;
}

let eventBuffer: (TrackingEvent & { ts: number })[] = [];
let batchTimeoutId: NodeJS.Timeout | null = null;
let consecutive429Count = 0;
let backoffUntil = 0;

export function trackEvent(event: TrackingEvent) {
    if (typeof window === 'undefined') return;

    if (Date.now() < backoffUntil) {
        return; // Backed off
    }

    eventBuffer.push({ ...event, ts: Date.now() } as any);

    if (!batchTimeoutId) {
        batchTimeoutId = setTimeout(flushEvents, 1000); // 1s buffer
    }

    if (eventBuffer.length >= 10) {
        if (batchTimeoutId) clearTimeout(batchTimeoutId);
        flushEvents();
    }
}

async function flushEvents() {
    batchTimeoutId = null;
    if (eventBuffer.length === 0) return;

    if (Date.now() < backoffUntil) {
        eventBuffer = []; // Discard to avoid massive heap
        return;
    }

    const batch = [...eventBuffer];
    eventBuffer = [];

    const url = '/api/public/events';

    try {
        const payload = batch[0]; // for backward compatibility, or send array if backend updated

        // Let's send them one by one or grouped if backend supports it. The payload expects a single event in the schema for now.
        // The most critical spray is usually ROI slider changes which just spam one event.
        // We will just take the latest `roi_change` if there are multiple.

        const dedupedBatch = Object.values(batch.reduce((acc, curr) => {
            if (curr.type === 'roi_change' || curr.type === 'view_section') {
                // Keep only latest of same type & section
                acc[`${curr.type}_${curr.section}`] = curr;
            } else {
                // Keep all others
                acc[`${curr.type}_${curr.ts}`] = curr;
            }
            return acc;
        }, {} as Record<string, any>));

        for (const ev of dedupedBatch) {
            const jsonStr = JSON.stringify(ev);
            try {
                if (navigator.sendBeacon) {
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    navigator.sendBeacon(url, blob);
                } else {
                    const res = await safeFetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: jsonStr,
                        keepalive: true,
                        maxRetries: 2, // Reduce retries for analytics
                        baseBackoffMs: 500
                    });
                    if (res.status === 429) {
                        consecutive429Count++;
                        // backoff expo com jitter max 1 min global buffer
                        const delay = Math.min(1000 * Math.pow(2, consecutive429Count), 60000) + Math.random() * 500;
                        backoffUntil = Date.now() + delay;
                        break; // Stop sending the rest for now
                    } else {
                        consecutive429Count = 0; // success resets
                    }
                }
            } catch (err) {
                // Ignore network err
            }
        }
    } catch (err) {
        // Silently fail
    }
}
