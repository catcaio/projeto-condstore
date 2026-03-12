'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { CondstoreLogo } from '@/ui/components/Logo';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { ChevronDown } from 'lucide-react';

interface NavGroup {
    label: string;
    links: readonly { label: string; href: string }[];
}

const navGroups: NavGroup[] = [
    {
        label: 'Produto',
        links: [
            { label: 'Condstore Envios', href: '/produtos/envios' },
            { label: 'Condstore CRM', href: '/produtos/crm' },
            { label: 'DOMINE', href: '/produtos/domine' },
            { label: 'Cockpit OS', href: '/plataforma' },
            { label: 'Frank Supremo', href: '/como-funciona' },
        ],
    },
    {
        label: 'Soluções',
        links: [
            { label: 'Logística', href: '/solucoes' },
            { label: 'Segurança', href: '/seguranca' },
            { label: 'App', href: '/app' },
        ],
    },
    {
        label: 'Recursos',
        links: [
            { label: 'Como funciona', href: '/como-funciona' },
            { label: 'Implantação', href: '/implantacao' },
            { label: 'Casos', href: '/casos' },
            { label: 'Valores', href: '/valores' },
        ],
    },
];

const allLinks = navGroups.flatMap(g => g.links);

function NavDropdown({ group }: { group: NavGroup }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 text-[13px] font-semibold text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
            >
                {group.label}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
            </button>
            <div
                className={cn(
                    'absolute top-full left-0 mt-2 w-48 rounded-xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-page))] shadow-lg shadow-[hsl(var(--ui-shadow)/0.1)] py-1.5 backdrop-blur-xl transition-all duration-200 origin-top',
                    open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
                )}
            >
                {group.links.map((link) => (
                    <Link
                        key={link.href + link.label}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-2.5 text-[13px] font-semibold text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)] transition-colors"
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}

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

                    <nav className="hidden md:flex items-center gap-6">
                        {navGroups.map((group) => (
                            <NavDropdown key={group.label} group={group} />
                        ))}
                    </nav>
                </div>

                {/* Right: CTAs + Theme Toggle */}
                <div className="hidden md:flex items-center gap-3">
                    <ThemeToggle />
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
                        {navGroups.map((group) => (
                            <div key={group.label} className="py-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-subtle))] mb-2 block">
                                    {group.label}
                                </span>
                                {group.links.map((link) => (
                                    <Link
                                        key={link.href + link.label}
                                        href={link.href}
                                        onClick={() => setMobileOpen(false)}
                                        className="text-sm font-semibold text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] py-2.5 block transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        ))}
                        <div className="flex flex-col gap-3 pt-4 border-t border-[hsl(var(--ui-border)/0.3)] mt-2">
                            <div className="flex items-center gap-3 py-2">
                                <ThemeToggle />
                                <span className="text-xs text-[hsl(var(--ui-text-muted))]">Alternar tema</span>
                            </div>
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
