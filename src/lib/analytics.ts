// src/lib/analytics.ts

/**
 * Public Analytics Tracker Engine
 * Resilient to ad-blockers, offline networks, and rendering loops.
 */
export function track(event: string, props?: Record<string, any>) {
    // Escape early if SSR
    if (typeof window === 'undefined') return;

    try {
        const payloadStr = JSON.stringify({
            event,
            path: window.location.pathname,
            props
        });

        // Hard truncation safety in case devs pass huge objects
        if (payloadStr.length > 4096) {
            console.warn('[Analytics] Warning: Payload dropped due to exceeding size limits.');
            return;
        }

        // Prepare the priority strategy: navigator.sendBeacon > keepalive fetch
        const API_ENDPOINT = '/api/events';
        const blob = new Blob([payloadStr], { type: 'application/json' });

        // Strategy 1: sendBeacon (guarantees delivery if page unloads)
        if (navigator.sendBeacon) {
            const success = navigator.sendBeacon(API_ENDPOINT, blob);
            if (success) return;
            // If it returns false, it usually means payload was too large or queue is full, fallback to fetch
        }

        // Strategy 2: Default to Fetch Keepalive
        fetch(API_ENDPOINT, {
            method: 'POST',
            body: payloadStr,
            keepalive: true, // Crucial for unload events
            headers: {
                'Content-Type': 'application/json'
            }
        }).catch(() => {
            // Swallowed strictly as requested (no throw up to the application level)
        });

    } catch (err) {
        // Absolute silence if JSON.stringify fails or any bizarre edge case
        console.warn('[Analytics] Error in tracking call', err);
    }
}

// ----------------------------------------------------------------------------
// Hooks Helpers
// ----------------------------------------------------------------------------

import { useEffect, useRef } from 'react';

/**
 * Hook to inject scroll depth trackers 1-time per mount
 */
export function useScrollTracker(pageContext: string) {
    const fired50 = useRef(false);
    const fired90 = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let debounceTimeout: NodeJS.Timeout;

        const handleScroll = () => {
            clearTimeout(debounceTimeout);

            // Limit computational frequency of calculations
            debounceTimeout = setTimeout(() => {
                const scrollHeight = document.documentElement.scrollHeight;
                const scrollTop = window.scrollY;
                const clientHeight = document.documentElement.clientHeight;

                const maxScroll = scrollHeight - clientHeight;
                if (maxScroll <= 0) return; // Prevent calc on non-scrollable pages

                const percentage = (scrollTop / maxScroll) * 100;

                if (!fired50.current && percentage >= 50) {
                    fired50.current = true;
                    track(`${pageContext}_scroll_50`);
                }

                if (!fired90.current && percentage >= 90) {
                    fired90.current = true;
                    track(`${pageContext}_scroll_90`);
                }

            }, 100); // 100ms throttle
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearTimeout(debounceTimeout);
        };
    }, [pageContext]);
}
