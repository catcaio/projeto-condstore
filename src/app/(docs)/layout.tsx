import React from 'react';
import Link from 'next/link';
import { BrandHeader } from '@/ui/components/brand/BrandHeader';

export default function DocsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))]">
            <BrandHeader />
            <div className="flex flex-1 mx-auto w-full max-w-7xl">
                {/* Sidebar Navigation */}
                <aside className="hidden w-64 flex-col border-r border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface-elevated))] p-6 md:flex shrink-0">
                    <nav className="space-y-8">
                        <div>
                            <h4 className="mb-2 font-semibold text-[hsl(var(--ui-text))]">Começar</h4>
                            <div className="flex flex-col space-y-2 text-sm text-[hsl(var(--ui-text-subtle))]">
                                <Link href="/docs/getting-started" className="hover:text-[hsl(var(--ui-text))]">Introdução</Link>
                                <Link href="/docs/faq" className="hover:text-[hsl(var(--ui-text))]">FAQ</Link>
                            </div>
                        </div>
                        <div>
                            <h4 className="mb-2 font-semibold text-[hsl(var(--ui-text))]">Desenvolvedores</h4>
                            <div className="flex flex-col space-y-2 text-sm text-[hsl(var(--ui-text-subtle))]">
                                <Link href="/docs/api" className="hover:text-[hsl(var(--ui-text))]">Referência da API</Link>
                            </div>
                        </div>
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 p-6 md:p-10 max-w-4xl">
                    <div className="prose prose-zinc dark:prose-invert max-w-none">
                        {children}
                    </div>
                </main>
            </div>

            <footer className="border-t border-[hsl(var(--ui-border))] py-6 text-center text-sm text-[hsl(var(--ui-text-muted))]">
                Documentação Oficial do CONDSTORE OS
            </footer>
        </div>
    );
}
