/**
 * Lightweight internal analytics tracking utility
 */
export function track(event: string, payload?: object) {
    // In a real application, this might map to Mixpanel, Segment, GA4, etc.
    // We keep it as a structured console log for now as requested.
    const timestamp = new Date().toISOString();
    console.log(`[Analytics: ${event}]`, { timestamp, ...payload });
}
