import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { TrackedLink } from '@/ui/lib/track-client';
import { BrandHeader } from '@/ui/components/brand/BrandHeader';

export const metadata: Metadata = {
    icons: {
        icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
        shortcut: ['/favicon.svg']
    }
};

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const isDev = process.env.NODE_ENV === 'development';
    const showBuildInfo = process.env.NEXT_PUBLIC_SHOW_BUILD === '1';

    // Status banner if ENV is set
    const buildSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local';

    return (
        <div className="min-h-screen flex flex-col os-root bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))]">
            {showBuildInfo && (
                <div className="w-full bg-[hsl(var(--ui-accent-blue))] px-4 py-1 flex items-center justify-center text-[11px] font-mono text-white">
                    BUILD: {buildSha} | ENV: {process.env.NEXT_PUBLIC_VERCEL_ENV || 'development'}
                </div>
            )}

            <BrandHeader />

            <main className="flex-1">
                {children}
            </main>

            <footer className="border-t border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface))] py-12">
                <div className="mx-auto max-w-[var(--container-max-width)] px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-sm text-[hsl(var(--ui-text-muted))]">
                        &copy; {new Date().getFullYear()} LojaCond. Todos os direitos reservados.
                    </div>

                    <div className="flex gap-6 text-sm text-[hsl(var(--ui-text-muted))]">
                        <Link href="/about" className="hover:text-[hsl(var(--ui-text))]">Sobre</Link>
                        <Link href="/docs" className="hover:text-[hsl(var(--ui-text))]">Documentação</Link>
                        <Link href="#" className="hover:text-[hsl(var(--ui-text))]">Status</Link>
                        <Link href="#" className="hover:text-[hsl(var(--ui-text))]">Contato</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
