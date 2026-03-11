import React from 'react';
import { PublicHeader } from '@/ui/site/public-header';
import { PublicFooter } from '@/ui/site/public-footer';

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="site-dark min-h-screen flex flex-col bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))]">
            <PublicHeader />
            <main className="flex-1">
                {children}
            </main>
            <PublicFooter />
        </div>
    );
}
