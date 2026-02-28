export interface TrackingEvent {
    type: 'view_section' | 'click_cta' | 'roi_change' | 'entry_start' | 'entry_success';
    page: string;
    section: string;
    element?: string;
    metadata?: Record<string, any>;
}

export function trackEvent({ type, page, section, element, metadata }: TrackingEvent) {
    if (typeof window === 'undefined') return;

    try {
        const payload = {
            type,
            page,
            section,
            element: element || undefined,
            metadata: metadata || undefined,
            ts: Date.now(),
        };

        const jsonStr = JSON.stringify(payload);
        const url = '/api/public/events';

        // Try sendBeacon
        if (navigator.sendBeacon) {
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const queued = navigator.sendBeacon(url, blob);
            if (queued) return;
        }

        // Fallback fetch keepalive
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: jsonStr,
            keepalive: true,
        }).catch(() => {
            // Silently fail so we never block main thread
        });
    } catch (err) {
        // Silently fail
    }
}
