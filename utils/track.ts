/**
 * Lightweight internal analytics tracking utility
 */
export type AnalyticsEvent =
    | 'pricing_view'
    | 'plan_select'
    | 'plan_expand_details'
    | 'checkout_start'
    | 'pricing_expand_options'
    | 'pricing_scroll_depth_50'
    | 'pricing_scroll_depth_90'
    | 'pricing_anchor_visible'
    | 'checkout_error'
    | 'checkout_redirect'
    | 'checkout_success';

export function track(event: AnalyticsEvent | string, payload?: object) {
    // In a real application, this might map to Mixpanel, Segment, GA4, etc.
    // We keep it as a structured console log for now as requested.
    const timestamp = new Date().toISOString();
    console.log(`[Analytics: ${event}]`, { timestamp, ...payload });
}
