'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { PublicHeader } from '@/ui/site/public-header';
import { PublicFooter } from '@/ui/site/public-footer';
import { SiteThemeProvider } from '@/ui/site/theme-provider';

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isSitemap = pathname === '/sitemap' || pathname === '/sitemap/';

    if (isSitemap) {
        return (
            <SiteThemeProvider>
                <div className="h-[100dvh] w-screen overflow-hidden flex flex-col">
                    {children}
                </div>
            </SiteThemeProvider>
        );
    }

    return (
        <SiteThemeProvider>
            <PublicHeader />
            <main className="flex-1">
                {children}
            </main>
            <PublicFooter />
        </SiteThemeProvider>
    );
}
