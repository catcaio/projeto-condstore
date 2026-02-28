'use client';

import React, { ComponentProps, useEffect, useRef } from 'react';
import Link from 'next/link';
import { trackEvent } from './track';

type TrackedLinkProps = ComponentProps<typeof Link> & {
    trackPage: string;
    trackSection: string;
    trackElement: string;
    metadata?: Record<string, any>;
};

export function TrackedLink({
    trackPage,
    trackSection,
    trackElement,
    metadata,
    children,
    href,
    onClick,
    ...rest
}: TrackedLinkProps) {

    // We compute the finalHref on render to include src/el if pointing to auth
    let finalHref = href.toString();
    const isAuthRoute = finalHref.includes('/login') || finalHref.includes('/signup');

    if (isAuthRoute) {
        try {
            // Safe URL parsing
            const urlObj = new URL(finalHref, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
            if (!urlObj.searchParams.has('src')) urlObj.searchParams.set('src', 'direct');
            if (!urlObj.searchParams.has('el')) urlObj.searchParams.set('el', trackElement);
            finalHref = urlObj.pathname + urlObj.search + urlObj.hash;
        } catch (e) { }
    }

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        trackEvent({
            type: 'click_cta',
            page: trackPage,
            section: trackSection,
            element: trackElement,
            metadata,
        });

        if (isAuthRoute) {
            // parse src logic (we could read real UTMs here if stored in cookie, but direct fallback is ok)
            // Save short-lived cookie for auth bridge linking
            document.cookie = `condstore_entry=direct:${trackElement}; max-age=${7 * 24 * 60 * 60}; path=/;`;
        }

        if (onClick) onClick(e);
    };

    return (
        <Link href={finalHref} onClick={handleClick} data-track={trackElement} {...rest}>
            {children}
        </Link>
    );
}

export function SectionTracker({ page, section }: { page: string, section: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const obs = new IntersectionObserver(([ent]) => {
            if (ent.isIntersecting) {
                trackEvent({ type: 'view_section', page, section });
                obs.disconnect(); // Trigger only once per load session
            }
        });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [page, section]);

    return <div ref={ref} aria-hidden="true" style={{ width: 0, height: 0, visibility: 'hidden', position: 'absolute' }} />;
}

export { trackEvent } from './track';
