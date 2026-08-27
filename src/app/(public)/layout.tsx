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
            <div
                style={{
                    '--ag-ink': '#0B0E13',
                    '--ag-paper': '#F5F6F8',
                    '--ag-accent': '#3E5CFF',
                    '--ag-muted': '#69717F',
                    '--font-space': '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
                } as React.CSSProperties}
                className="min-h-screen bg-[var(--ag-paper)] font-sans"
            >
                <PublicHeader />
                <main className="flex-1">{children}</main>
                <PublicFooter />
            </div>
        </SiteThemeProvider>
    );
}
