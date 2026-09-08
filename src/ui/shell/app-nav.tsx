'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect, type FocusEvent } from 'react';
import { Menu, X, LogOut, Loader2 } from 'lucide-react';
import { getPrimaryNavigationGroups, type ModuleConfig } from '@/config/modules';
import { isModuleAuthorized } from '@/config/rbac';
import { CondstoreLogo } from '@/ui/components';
import { ThemeToggle } from '@/ui/theme';

function NavLink({ item, pathname, expanded, onNavigate }: { item: ModuleConfig; pathname: string; expanded?: boolean; onNavigate?: () => void }) {
    const Icon = item.icon;
    const isActive = pathname === item.route || pathname.startsWith(item.route + '/');

    return (
        <Link
            href={item.route}
            title={item.label}
            onClick={() => { if (onNavigate) onNavigate(); }}
            className={`
                group relative flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150
                ${expanded ? 'w-full px-3 py-2.5 mb-1 h-auto rounded-lg' : 'md:justify-center md:px-0 md:h-11 md:w-11 md:rounded-xl md:mb-1'}
                ${isActive
                    ? 'bg-[hsl(var(--ui-accent-blue)/0.08)] text-[hsl(var(--ui-accent-blue))] font-medium md:bg-[hsl(var(--ui-accent-blue)/0.12)]'
                    : 'text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-bg)/0.8)] hover:text-[hsl(var(--ui-text))]'
                }
            `}
        >
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md md:bg-transparent md:shadow-none md:ring-0 ${isActive ? 'bg-white text-[hsl(var(--ui-accent-blue))] shadow-sm ring-1 ring-black/5' : 'bg-transparent group-hover:bg-white group-hover:shadow-sm group-hover:ring-1 group-hover:ring-black/5 md:group-hover:bg-transparent md:group-hover:shadow-none'} ${expanded ? 'md:bg-transparent md:shadow-none md:ring-0' : ''}`}>
                <Icon className="h-5 w-5" />
            </span>
            <span className={`min-w-0 flex-1 truncate text-sm ${expanded ? '' : 'md:hidden'}`}>
                {item.label}
            </span>

            {/* Tooltip for desktop when compact */}
            {!expanded && (
                <div className="hidden md:group-hover:block absolute left-full ml-3 rounded bg-gray-900 px-2 py-1 text-xs font-semibold text-white whitespace-nowrap z-50">
                    {item.label}
                    <div className="absolute top-1/2 -left-1 -mt-1 h-2 w-2 rotate-45 bg-gray-900" />
                </div>
            )}
        </Link>
    );
}

export function AppNav({
    role,
    tenantId,
    expanded = false
}: {
    role: string;
    tenantId: string | null;
    expanded?: boolean;
}) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const hamburgerRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    const navGroups = getPrimaryNavigationGroups()
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => isModuleAuthorized(item, role, true).authorized),
        }))
        .filter((group) => group.items.length > 0);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
        } catch (e) {
            console.error('Logout error', e);
            setIsLoggingOut(false);
        }
    };

    // Escape listener for accessibility
    useEffect(() => {
        if (!mobileOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMobileOpen(false);
                hamburgerRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mobileOpen]);

    // Focus close button on mobile drawer open
    useEffect(() => {
        if (mobileOpen) {
            setTimeout(() => {
                closeButtonRef.current?.focus();
            }, 50);
        }
    }, [mobileOpen]);

    const renderNavContent = (onNav?: () => void) => (
        <div className={`flex h-full w-full flex-col gap-8 ${expanded ? 'items-start' : 'md:items-center'}`}>
            {navGroups.map((group) => (
                <div key={group.key} className="flex flex-col w-full">
                    <p className={`mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))] w-full ${expanded ? '' : 'md:hidden'}`}>
                        {group.title}
                    </p>
                    <div className={`flex mb-4 md:mb-0 flex-col gap-1.5 w-full ${expanded ? 'items-start' : 'items-center'}`}>
                        {group.items.map((item) => (
                            <NavLink key={item.id} item={item} pathname={pathname} expanded={expanded} onNavigate={onNav} />
                        ))}
                    </div>
                </div>
            ))}

            <div className="mt-auto flex w-full flex-col items-center gap-3 border-t border-[hsl(var(--ui-border))] pt-6 md:border-none">
                <div className={`px-3 w-full ${expanded ? '' : 'md:hidden'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))]">
                        Sessão
                    </p>
                    <div className="mt-2 flex flex-col gap-1 text-[11px] text-[hsl(var(--ui-text-muted))]">
                        <span>Perfil: <strong className="font-semibold text-slate-700">{role}</strong></span>
                        {tenantId && <span>Tenant: <strong className="font-semibold text-slate-700">{tenantId}</strong></span>}
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    title="Sair do Sistema"
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[hsl(var(--ui-text-muted))] hover:bg-red-50 hover:text-red-600 focus:outline-none transition-colors text-left group relative ${expanded ? 'w-full px-3 py-2.5 h-auto rounded-lg' : 'md:px-0 md:justify-center md:h-11 md:w-11'}`}
                >
                    {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                    <span className={expanded ? '' : 'md:hidden'}>Sair</span>

                    {!expanded && (
                        <div className="hidden md:group-hover:block absolute left-full ml-3 rounded bg-gray-900 px-2 py-1 text-xs font-semibold text-white whitespace-nowrap z-50">
                            Sair
                            <div className="absolute top-1/2 -left-1 -mt-1 h-2 w-2 rotate-45 bg-gray-900" />
                        </div>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <div className="hidden h-full w-full md:block">
                <nav role="navigation" aria-label="Menu principal" className="h-full w-full">
                    {renderNavContent()}
                </nav>
            </div>

            <div className="md:hidden">
                <button
                    ref={hamburgerRef}
                    onClick={() => setMobileOpen(true)}
                    aria-expanded={mobileOpen}
                    aria-controls="mobile-nav-drawer"
                    aria-label={mobileOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
                    className="flex items-center gap-2 rounded-xl border border-[hsl(var(--ui-border))] px-3 py-2 text-sm font-medium text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                >
                    <Menu className="h-5 w-5" />
                    Navegacao
                </button>

                {mobileOpen && (
                    <div
                        id="mobile-nav-drawer"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu de navegação"
                        className="fixed inset-0 z-50 flex md:hidden"
                    >
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
                            onClick={() => {
                                setMobileOpen(false);
                                hamburgerRef.current?.focus();
                            }}
                        />

                        {/* Drawer panel */}
                        <div className="relative flex w-full max-w-[280px] sm:max-w-xs flex-col bg-[hsl(var(--ui-surface))] p-4 shadow-xl ring-1 ring-black/5 h-full min-w-0 overflow-hidden">
                            <div className="flex justify-between items-center mb-6 border-b border-[hsl(var(--ui-border))] pb-4">
                                <span className="font-semibold text-sm text-[hsl(var(--ui-text))]">Navegação</span>
                                <button
                                    ref={closeButtonRef}
                                    onClick={() => {
                                        setMobileOpen(false);
                                        hamburgerRef.current?.focus();
                                    }}
                                    aria-label="Fechar menu"
                                    className="p-1.5 rounded-lg border border-[hsl(var(--ui-border))] hover:bg-slate-50 text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))]"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <nav role="navigation" aria-label="Menu principal" className="h-full">
                                    {renderNavContent(() => setMobileOpen(false))}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export function Sidebar({
    role,
    tenantId
}: {
    role: string;
    tenantId: string | null;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const isExpanded = isHovered || isFocused;

    const handleFocusCapture = () => {
        setIsFocused(true);
    };

    const handleBlurCapture = (e: FocusEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsFocused(false);
        }
    };

    return (
        <aside
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocusCapture={handleFocusCapture}
            onBlurCapture={handleBlurCapture}
            className="z-30 min-w-0 shrink-0 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] md:h-dvh md:border-b-0 md:border-r transition-[width] duration-200 overflow-hidden"
            style={{ width: isExpanded ? '15rem' : '4.5rem' }}
        >
            <div className={`flex min-h-0 flex-col px-3 py-3 md:h-full md:py-4 transition-[padding] duration-200 ${isExpanded ? 'md:px-4 items-start' : 'md:px-0 items-center'}`}>
                <div className="mb-3 flex items-center justify-center md:mb-6 shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm">
                        <CondstoreLogo size="sm" hideText />
                    </div>
                </div>

                <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-0 md:px-2">
                    <AppNav role={role} tenantId={tenantId} expanded={isExpanded} />
                </div>

                <div className="mt-auto hidden w-full flex-col items-center gap-4 border-t border-[hsl(var(--ui-border))] pb-2 pt-4 md:flex shrink-0">
                    <ThemeToggle />
                </div>
            </div>
        </aside>
    );
}
