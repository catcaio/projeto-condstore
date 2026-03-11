'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CondstoreLogo } from '@/ui/components/Logo';
import { cn } from '@/lib/utils';

const navLinks = [
    { label: 'Soluções', href: '/solucoes' },
    { label: 'Como funciona', href: '/como-funciona' },
    { label: 'Plataforma', href: '/plataforma' },
] as const;

export function PublicHeader() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-page)/0.85)] backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-[var(--container-max-width)] items-center justify-between px-6 lg:px-8">
                {/* Left: Logo + Nav */}
                <div className="flex items-center gap-10">
                    <Link href="/" className="transition-opacity hover:opacity-80">
                        <CondstoreLogo size="sm" hideSubtitle />
                    </Link>

                    <nav className="hidden md:flex items-center gap-7">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-[13px] font-semibold text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Right: CTAs */}
                <div className="hidden md:flex items-center gap-3">
                    <Link
                        href="/login"
                        className="text-[13px] font-semibold text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors px-3 py-2"
                    >
                        Entrar
                    </Link>
                    <Link
                        href="/signup"
                        className="inline-flex h-9 items-center justify-center rounded-full bg-[hsl(var(--ui-accent-blue))] px-5 text-[13px] font-bold text-white transition-all hover:bg-[hsl(var(--ui-accent-blue-strong))] shadow-sm shadow-[hsl(var(--ui-accent-blue)/0.2)]"
                    >
                        Começar agora
                    </Link>
                </div>

                {/* Mobile toggle */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden flex flex-col gap-1 p-2"
                    aria-label="Menu"
                >
                    <span className={cn('block w-5 h-0.5 bg-[hsl(var(--ui-text))] transition-transform', mobileOpen && 'rotate-45 translate-y-[3px]')} />
                    <span className={cn('block w-5 h-0.5 bg-[hsl(var(--ui-text))] transition-opacity', mobileOpen && 'opacity-0')} />
                    <span className={cn('block w-5 h-0.5 bg-[hsl(var(--ui-text))] transition-transform', mobileOpen && '-rotate-45 -translate-y-[3px]')} />
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-page))]">
                    <nav className="flex flex-col px-6 py-4 gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className="text-sm font-semibold text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] py-3 transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="flex flex-col gap-3 pt-4 border-t border-[hsl(var(--ui-border)/0.3)] mt-2">
                            <Link href="/login" className="text-sm font-semibold text-[hsl(var(--ui-text-muted))] py-2">
                                Entrar
                            </Link>
                            <Link
                                href="/signup"
                                className="inline-flex h-10 items-center justify-center rounded-full bg-[hsl(var(--ui-accent-blue))] px-5 text-sm font-bold text-white"
                            >
                                Começar agora
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
