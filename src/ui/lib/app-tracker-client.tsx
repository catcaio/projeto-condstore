'use client';

import { useEffect } from 'react';
import { trackAppEvent } from './track-app';
import { usePathname } from 'next/navigation';

export function ApplicationTracker() {
    const pathname = usePathname();

    useEffect(() => {
        // Tracker fires signup_created on ANY first app load (dedup server-side guarantees only 1 per tenant)
        trackAppEvent({ type: 'signup_created' });

        // Track cockpit_viewed only if on /cockpit or /cockpit/overview
        if (pathname === '/cockpit' || pathname === '/cockpit/overview') {
            trackAppEvent({ type: 'cockpit_viewed' });
        }
    }, [pathname]);

    return null;
}
