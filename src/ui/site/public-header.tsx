'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AgilizapLogo } from '@/ui/components/AgilizapLogo';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';

const primaryCta = { label: 'Solicitar avaliação operacional', href: '/piloto' } as const;
const secondaryCta = { label: 'Entrar', href: '/login' } as const;

const navLinks = [
    { label: 'Produto', href: '/#produto' },
    { label: 'Como funciona', href: '/#como-funciona' },
    { label: 'Frank AI', href: '/#frank-ai' },
    { label: 'Tecnologia', href: '/#tecnologia' },
] as const;

export function PublicHeader() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#0B0E13]/90 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-[var(--container-max-width)] items-center justify-between px-6 lg:px-8">
                {/* Left: Logo + Nav */}
                <div className="flex items-center gap-8 lg:gap-10">
                    <Link href="/" className="transition-opacity hover:opacity-90">
                        <AgilizapLogo size="sm" />
                    </Link>

                    <nav className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-xs font-mono font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Right: CTAs + Theme Toggle */}
                <div className="hidden md:flex items-center gap-4">
                    <ThemeToggle />
                    <Link
                        href={secondaryCta.href}
                        className="text-xs font-semibold text-slate-300 hover:text-white transition-colors px-2 py-2"
                    >
                        {secondaryCta.label}
                    </Link>
                    <Link
                        href={primaryCta.href}
                        className="inline-flex h-9 items-center justify-center rounded-full bg-[#3E5CFF] px-4 text-xs font-semibold text-white transition-all hover:bg-[#3E5CFF]/90 shadow-md shadow-[#3E5CFF]/25"
                    >
                        {primaryCta.label}
                    </Link>
                </div>

                {/* Mobile toggle */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden flex flex-col gap-1 p-2 text-slate-300 hover:text-white"
                    aria-label="Menu"
                >
                    <span className={cn('block w-5 h-0.5 bg-current transition-transform', mobileOpen && 'rotate-45 translate-y-[3px]')} />
                    <span className={cn('block w-5 h-0.5 bg-current transition-opacity', mobileOpen && 'opacity-0')} />
                    <span className={cn('block w-5 h-0.5 bg-current transition-transform', mobileOpen && '-rotate-45 -translate-y-[3px]')} />
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-slate-800 bg-[#0B0E13]">
                    <nav className="flex flex-col px-6 py-4 gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className="text-sm font-mono text-slate-300 hover:text-white py-2.5 block transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="flex flex-col gap-3 pt-4 border-t border-slate-800 mt-2">
                            <div className="flex items-center gap-3 py-2">
                                <ThemeToggle />
                                <span className="text-xs text-slate-400 font-mono">Alternar tema</span>
                            </div>
                            <Link
                                href={secondaryCta.href}
                                onClick={() => setMobileOpen(false)}
                                className="text-sm font-semibold text-slate-300 py-2"
                            >
                                {secondaryCta.label}
                            </Link>
                            <Link
                                href={primaryCta.href}
                                onClick={() => setMobileOpen(false)}
                                className="inline-flex h-10 items-center justify-center rounded-full bg-[#3E5CFF] px-5 text-sm font-semibold text-white"
                            >
                                {primaryCta.label}
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
