'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, LogOut, Loader2, ChevronRight } from 'lucide-react';
import { getPrimaryNavigationGroups, type ModuleConfig } from '@/config/modules';
import { isModuleAuthorized } from '@/config/rbac';

type AppNavProps = {
    role: string;
    tenantId: string | null;
    desktopExpanded?: boolean;
    mobileOnly?: boolean;
    mobileOpen?: boolean;
    onMobileOpenChange?: (open: boolean) => void;
    onNavigate?: () => void;
};

function NavLink({ item, pathname, expanded, desktopExpandable, onNavigate }: { item: ModuleConfig; pathname: string; expanded: boolean; desktopExpandable?: boolean; onNavigate?: () => void }) {
    const Icon = item.icon;
    const isActive = pathname === item.route || pathname.startsWith(item.route + '/');

    return (
        <Link
            href={item.route}
            title={!expanded ? item.label : undefined}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex min-h-11 items-center gap-3 rounded-xl text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] ${expanded ? 'w-full px-3' : desktopExpandable ? 'w-11 justify-center md:group-hover/sidebar:w-full md:group-hover/sidebar:justify-start md:group-hover/sidebar:px-3' : 'w-11 justify-center'} ${isActive
                ? 'bg-[hsl(var(--ui-accent-blue)/0.12)] text-[hsl(var(--ui-accent-blue))] font-medium'
                : 'text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-bg)/0.8)] hover:text-[hsl(var(--ui-text))]'
            }`}
        >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            {expanded || desktopExpandable ? <span className={`${expanded ? '' : 'hidden md:group-hover/sidebar:inline'} min-w-0 flex-1 truncate text-sm`}>{item.label}</span> : null}
            {expanded || desktopExpandable ? <ChevronRight className={`${expanded ? '' : 'hidden md:group-hover/sidebar:block'} h-4 w-4 shrink-0 opacity-70`} aria-hidden="true" /> : null}
            {!expanded && !desktopExpandable ? (
                <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-semibold text-white shadow-lg group-hover:block group-focus-visible:block">
                    {item.label}
                </span>
            ) : null}
        </Link>
    );
}

export function AppNav({
    role,
    tenantId,
    desktopExpanded = false,
    mobileOnly = false,
    mobileOpen = false,
    onMobileOpenChange,
    onNavigate,
}: AppNavProps) {
    const pathname = usePathname();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [internalMobileOpen, setInternalMobileOpen] = useState(false);
    const resolvedMobileOpen = onMobileOpenChange ? mobileOpen : internalMobileOpen;
    const setMobileOpen = (open: boolean) => onMobileOpenChange ? onMobileOpenChange(open) : setInternalMobileOpen(open);
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

    const handleNavigate = () => onNavigate ? onNavigate() : setMobileOpen(false);

    const renderLinks = (expanded: boolean, desktopExpandable = false) => (
        <nav aria-label="Navegação principal" className={`flex flex-col ${expanded ? 'w-full gap-5' : desktopExpandable ? 'items-center gap-5 md:group-hover/sidebar:items-stretch' : 'items-center gap-5'}`}>
            {navGroups.map((group) => (
                <div key={group.key} className={`flex flex-col ${expanded || desktopExpandable ? 'w-full' : 'items-center'}`}>
                    {expanded || desktopExpandable ? <p className={`${expanded ? '' : 'hidden md:group-hover/sidebar:block'} mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]`}>{group.title}</p> : null}
                    <div className={`flex flex-col gap-1.5 ${expanded || desktopExpandable ? 'w-full' : 'items-center'}`}>
                        {group.items.map((item) => (
                            <NavLink key={item.id} item={item} pathname={pathname} expanded={expanded} desktopExpandable={desktopExpandable} onNavigate={handleNavigate} />
                        ))}
                    </div>
                </div>
            ))}

            {expanded || desktopExpandable ? (
                <div className={`${expanded ? '' : 'hidden md:group-hover/sidebar:block'} mt-auto border-t border-[hsl(var(--ui-border))] pt-4 text-xs text-[hsl(var(--ui-text-muted))]`}>
                    <p>Perfil: <strong className="font-semibold text-[hsl(var(--ui-text))]">{role}</strong></p>
                    {tenantId ? <p className="mt-1 truncate">Tenant: <strong className="font-semibold text-[hsl(var(--ui-text))]">{tenantId}</strong></p> : null}
                </div>
            ) : null}

            <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                title={!expanded ? 'Sair do sistema' : undefined}
                className={`group relative flex min-h-11 items-center gap-3 rounded-xl text-sm text-[hsl(var(--ui-text-muted))] transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${expanded ? 'w-full px-3 text-left' : desktopExpandable ? 'w-11 justify-center md:group-hover/sidebar:w-full md:group-hover/sidebar:justify-start md:group-hover/sidebar:px-3' : 'w-11 justify-center'}`}
            >
                {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                {expanded || desktopExpandable ? <span className={expanded ? '' : 'hidden md:group-hover/sidebar:inline'}>Sair</span> : <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-semibold text-white shadow-lg group-hover:block group-focus-visible:block">Sair</span>}
            </button>
        </nav>
    );

    if (mobileOnly) {
        return (
            <div className="relative">
                <button
                    type="button"
                    aria-expanded={resolvedMobileOpen}
                    aria-controls="mobile-navigation-drawer"
                    aria-label={mobileOpen ? 'Fechar navegação' : 'Abrir navegação'}
                    onClick={() => setMobileOpen(!resolvedMobileOpen)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text-muted))] shadow-sm transition-colors hover:text-[hsl(var(--ui-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))]"
                >
                    {resolvedMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                {resolvedMobileOpen ? (
                    <>
                        <button type="button" aria-label="Fechar navegação" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/20" />
                        <div id="mobile-navigation-drawer" className="absolute right-0 top-12 z-50 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-3 shadow-xl">
                            {renderLinks(true)}
                        </div>
                    </>
                ) : null}
            </div>
        );
    }

    return <div className="hidden min-h-0 md:block">{renderLinks(false, true)}</div>;
}
