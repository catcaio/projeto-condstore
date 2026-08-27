'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navLinks = [
    { label: 'Produto', href: '#produto' },
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Frank AI', href: '#frank' },
    { label: 'Tecnologia', href: '#tecnologia' },
] as const;

function AgilizapMark() {
    return (
        <span className="flex items-center gap-2.5" aria-label="AGILIZAP">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 4.5h8.5M3 9.75h14M3 15.5h8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M13.5 4.5 17 9.75l-3.5 5.75" stroke="var(--ag-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-[family-name:var(--font-space)] text-[15px] font-bold tracking-[-0.04em]">AGILIZAP</span>
        </span>
    );
}

export function PublicHeader() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-black/[0.08] bg-[var(--ag-paper)]/95 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
                <Link href="/" className="transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]">
                    <AgilizapMark />
                </Link>

                <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação principal">
                    {navLinks.map((link) => (
                        <a key={link.href} href={link.href} className="text-[12px] font-medium text-black/55 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]">
                            {link.label}
                        </a>
                    ))}
                </nav>

                <div className="hidden items-center gap-5 md:flex">
                    <Link href="/login" className="text-[12px] font-medium text-black/55 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]">
                        Entrar
                    </Link>
                    <Link href="/piloto" className="inline-flex h-9 items-center justify-center rounded-md bg-[var(--ag-ink)] px-4 text-[12px] font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]">
                        Conhecer o AGILIZAP
                    </Link>
                </div>

                <button onClick={() => setMobileOpen((open) => !open)} className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ag-accent)]" aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={mobileOpen}>
                    <span className={cn('block h-px w-5 bg-[var(--ag-ink)] transition-transform', mobileOpen && 'translate-y-[4px] rotate-45')} />
                    <span className={cn('block h-px w-5 bg-[var(--ag-ink)] transition-opacity', mobileOpen && 'opacity-0')} />
                    <span className={cn('block h-px w-5 bg-[var(--ag-ink)] transition-transform', mobileOpen && '-translate-y-[4px] -rotate-45')} />
                </button>
            </div>

            {mobileOpen && (
                <div className="border-t border-black/[0.08] bg-[var(--ag-paper)] md:hidden">
                    <nav className="mx-auto flex max-w-7xl flex-col px-5 py-4 sm:px-8" aria-label="Navegação móvel">
                        {navLinks.map((link) => (
                            <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="border-b border-black/[0.06] py-3.5 text-sm font-medium text-black/65">
                                {link.label}
                            </a>
                        ))}
                        <div className="flex items-center gap-4 pt-4">
                            <Link href="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-black/55">Entrar</Link>
                            <Link href="/piloto" onClick={() => setMobileOpen(false)} className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-[var(--ag-ink)] px-4 text-sm font-semibold text-white">Conhecer o AGILIZAP</Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
