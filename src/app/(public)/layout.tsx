import React from 'react';
import Link from 'next/link';

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

            <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-bg)/0.8)] backdrop-blur-sm">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
                    <div className="flex items-center gap-10">
                        <Link href="/" className="font-bold text-xl tracking-tighter">
                            LojaCond
                        </Link>
                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[hsl(var(--ui-text-muted))]">
                            <Link href="/pricing" className="hover:text-[hsl(var(--ui-text))] transition-colors">Preços</Link>
                            <Link href="/docs" className="hover:text-[hsl(var(--ui-text))] transition-colors">Documentação</Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-sm font-semibold hover:text-[hsl(var(--ui-text-muted))] transition-colors"
                        >
                            Entrar
                        </Link>
                        <Link
                            href={isDev ? '/cockpit/audit?status=success' : '/pricing'}
                            className="inline-flex h-9 items-center justify-center rounded-full bg-[hsl(var(--ui-text))] px-4 text-sm font-medium text-[hsl(var(--ui-bg))] transition-colors hover:opacity-90 shadow-sm"
                        >
                            Começar grátis
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {children}
            </main>

            <footer className="border-t border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface))] py-12">
                <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-sm text-[hsl(var(--ui-text-muted))]">
                        &copy; {new Date().getFullYear()} LojaCond. Todos os direitos reservados.
                    </div>

                    <div className="flex gap-6 text-sm text-[hsl(var(--ui-text-muted))]">
                        <Link href="/docs" className="hover:text-[hsl(var(--ui-text))]">Documentação</Link>
                        <Link href="#" className="hover:text-[hsl(var(--ui-text))]">Status</Link>
                        <Link href="#" className="hover:text-[hsl(var(--ui-text))]">Contato</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
