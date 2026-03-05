import React from 'react';
import Link from 'next/link';
import { TrackedLink } from '@/ui/lib/track-client';
import { CondstoreLogo } from '@/ui/components/Logo';

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

            <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.8)] backdrop-blur-sm">
                <div className="mx-auto flex h-16 max-w-[var(--container-max-width)] items-center justify-between px-6 lg:px-8">
                    <div className="flex items-center gap-10">
                        <Link href="https://www.condstoreos.com" className="transition-transform hover:scale-105 active:scale-95">
                            <CondstoreLogo size="sm" hideSubtitle={true} />
                        </Link>
                        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[hsl(var(--ui-text-muted))]">

                            {/* Produtos Dropdown */}
                            <div className="relative group p-4 -m-4">
                                <span className="cursor-default hover:text-[hsl(var(--ui-text))] transition-colors flex items-center gap-1">
                                    Produtos
                                    <svg className="w-3 h-3 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </span>
                                <div className="absolute left-0 mt-4 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 overflow-hidden">
                                    <div className="flex flex-col py-2">
                                        <Link href="/produtos/envios" className="px-5 py-3 hover:bg-gray-50 flex flex-col">
                                            <span className="text-blue-600 font-bold">Condstore Envios</span>
                                            <span className="text-xs text-gray-500 font-normal mt-0.5">Gateway e Automação</span>
                                        </Link>
                                        <Link href="/produtos/crm" className="px-5 py-3 hover:bg-gray-50 flex flex-col border-t border-gray-50">
                                            <span className="text-[#0A2540] font-bold">Condstore CRM</span>
                                            <span className="text-xs text-gray-500 font-normal mt-0.5">Gestão de Vendas B2B</span>
                                        </Link>
                                        <Link href="/produtos/domine" className="px-5 py-3 hover:bg-gray-50 flex flex-col border-t border-gray-50">
                                            <span className="text-indigo-600 font-bold">Condstore DOMINE</span>
                                            <span className="text-xs text-gray-500 font-normal mt-0.5">Eventos e Agentes IA</span>
                                        </Link>
                                        <Link href="/plataforma/cockpit" className="px-5 py-3 hover:bg-gray-50 flex flex-col border-t border-gray-50">
                                            <span className="text-purple-600 font-bold">Cockpit OS</span>
                                            <span className="text-xs text-gray-500 font-normal mt-0.5">App Launcher B2B</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            {/* Planos Dropdown */}
                            <div className="relative group p-4 -m-4">
                                <span className="cursor-default hover:text-[hsl(var(--ui-text))] transition-colors flex items-center gap-1">
                                    Planos
                                    <svg className="w-3 h-3 transition-transform group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </span>
                                <div className="absolute left-0 mt-4 w-40 bg-white border border-gray-100 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 overflow-hidden">
                                    <div className="flex flex-col py-2">
                                        <Link href="/planos/envios" className="px-5 py-2.5 hover:bg-gray-50 text-gray-800 font-medium">Envios</Link>
                                        <Link href="/planos/crm" className="px-5 py-2.5 hover:bg-gray-50 text-gray-800 font-medium border-t border-gray-50">CRM</Link>
                                        <Link href="/planos/domine" className="px-5 py-2.5 hover:bg-gray-50 text-gray-800 font-medium border-t border-gray-50">DOMINE (IA)</Link>
                                    </div>
                                </div>
                            </div>

                            <Link href="/integracoes" className="hover:text-[hsl(var(--ui-text))] transition-colors">Integrações (Hub)</Link>
                            <Link href="/sobre" className="hover:text-[hsl(var(--ui-text))] transition-colors">Sobre</Link>
                            <Link href="/tecnologias" className="hover:text-[hsl(var(--ui-text))] transition-colors">Tecnologia</Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <TrackedLink
                            href="/login"
                            className="text-sm font-semibold hover:text-[hsl(var(--ui-text-muted))] transition-colors"
                            trackPage="shared"
                            trackSection="navbar"
                            trackElement="login"
                        >
                            Entrar
                        </TrackedLink>
                        <TrackedLink
                            href="/cotacao"
                            className="hidden lg:inline-flex h-9 items-center justify-center rounded-[var(--radius-button)] border border-[hsl(var(--ui-border))] bg-transparent px-4 text-sm font-semibold text-[hsl(var(--ui-text))] transition-colors hover:bg-[hsl(var(--ui-border)/0.5)]"
                            trackPage="shared"
                            trackSection="navbar"
                            trackElement="navbar_quote"
                        >
                            Cotação Rápida
                        </TrackedLink>
                        <TrackedLink
                            href={isDev ? '/cockpit/audit?status=success' : '/signup'}
                            className="inline-flex h-9 items-center justify-center rounded-[var(--radius-button)] bg-[hsl(var(--ui-accent-blue))] px-4 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--ui-accent-blue-strong))] shadow-[var(--shadow-soft)]"
                            trackPage="shared"
                            trackSection="navbar"
                            trackElement="navbar_pricing"
                        >
                            Começar grátis
                        </TrackedLink>
                    </div>
                </div>
            </header>

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
