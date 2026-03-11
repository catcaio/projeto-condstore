import React from 'react';
import { PublicHeader } from '@/ui/site/public-header';
import { PublicFooter } from '@/ui/site/public-footer';
import { SiteThemeProvider } from '@/ui/site/theme-provider';

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
