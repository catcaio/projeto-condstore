'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, LogOut, Loader2 } from 'lucide-react';
import { getPrimaryNavigationGroups, type ModuleConfig } from '@/config/modules';
import { isModuleAuthorized } from '@/config/rbac';

function NavLink({ item, pathname }: { item: ModuleConfig; pathname: string }) {
    const Icon = item.icon;
    const isActive = pathname === item.route || pathname.startsWith(item.route + '/');

    return (
        <Link
            href={item.route}
            title={item.label}
            className={`
                group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150
                md:justify-center md:px-0 md:h-11 md:w-11 md:rounded-xl md:mb-1 md:group-hover/sidebar:w-full md:group-hover/sidebar:justify-start md:group-hover/sidebar:px-3 md:group-hover/sidebar:rounded-lg md:group-focus-within/sidebar:w-full md:group-focus-within/sidebar:justify-start md:group-focus-within/sidebar:px-3 md:group-focus-within/sidebar:rounded-lg
                ${isActive
                    ? 'bg-[hsl(var(--ui-accent-blue)/0.08)] text-[hsl(var(--ui-accent-blue))] font-medium md:bg-[hsl(var(--ui-accent-blue)/0.12)]'
                    : 'text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-bg)/0.8)] hover:text-[hsl(var(--ui-text))]'
                }
            `}
        >
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md md:bg-transparent md:shadow-none md:ring-0 ${isActive ? 'bg-white text-[hsl(var(--ui-accent-blue))] shadow-sm ring-1 ring-black/5' : 'bg-transparent group-hover:bg-white group-hover:shadow-sm group-hover:ring-1 group-hover:ring-black/5 md:group-hover:bg-transparent md:group-hover:shadow-none'}`}>
                <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm transition-[width,opacity] duration-150 md:invisible md:w-0 md:opacity-0 md:group-hover/sidebar:visible md:group-hover/sidebar:w-auto md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:visible md:group-focus-within/sidebar:w-auto md:group-focus-within/sidebar:opacity-100">
                {item.label}
            </span>
            
            {/* Tooltip for desktop */}
            <div className="hidden md:group-hover:block absolute left-full ml-3 rounded bg-gray-900 px-2 py-1 text-xs font-semibold text-white whitespace-nowrap z-50">
                {item.label}
                <div className="absolute top-1/2 -left-1 -mt-1 h-2 w-2 rotate-45 bg-gray-900" />
            </div>
        </Link>
    );
}

export function AppNav({ role, tenantId }: { role: string; tenantId: string | null }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
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

    const navContent = (
        <nav className="flex h-full w-full flex-col gap-8 md:items-start">
            {navGroups.map((group) => (
                <div key={group.key} className="flex w-full flex-col items-center md:items-start">
                    <p className="mb-2 h-0 overflow-hidden px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))] opacity-0 transition-[height,opacity] duration-150 md:group-hover/sidebar:h-auto md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:h-auto md:group-focus-within/sidebar:opacity-100">
                        {group.title}
                    </p>
                    <div className="flex mb-4 md:mb-0 w-full flex-col items-center gap-1.5">
                        {group.items.map((item) => (
                            <NavLink key={item.id} item={item} pathname={pathname} />
                        ))}
                    </div>
                </div>
            ))}

            <div className="mt-auto flex w-full flex-col items-center gap-3 border-t border-[hsl(var(--ui-border))] pt-6 md:border-none md:items-start">
                <div className="px-3 md:hidden w-full">
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
                    className="group relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[hsl(var(--ui-text-muted))] transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none md:h-11 md:w-11 md:justify-center md:px-0 md:group-hover/sidebar:w-full md:group-hover/sidebar:justify-start md:group-hover/sidebar:px-3 md:group-focus-within/sidebar:w-full md:group-focus-within/sidebar:justify-start md:group-focus-within/sidebar:px-3"
                >
                    {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                    <span className="invisible w-0 truncate opacity-0 transition-[width,opacity] duration-150 md:group-hover/sidebar:visible md:group-hover/sidebar:w-auto md:group-hover/sidebar:opacity-100 md:group-focus-within/sidebar:visible md:group-focus-within/sidebar:w-auto md:group-focus-within/sidebar:opacity-100">Sair</span>
                    
                    {/* Tooltip for desktop */}
                    <div className="hidden md:group-hover:block absolute left-full ml-3 rounded bg-gray-900 px-2 py-1 text-xs font-semibold text-white whitespace-nowrap z-50">
                        Sair
                        <div className="absolute top-1/2 -left-1 -mt-1 h-2 w-2 rotate-45 bg-gray-900" />
                    </div>
                </button>
            </div>
        </nav>
    );

    return (
        <>
            <div className="hidden h-full w-full md:block">
                {navContent}
            </div>

            <div className="md:hidden">
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="flex items-center gap-2 rounded-xl border border-[hsl(var(--ui-border))] px-3 py-2 text-sm font-medium text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    Navegacao
                </button>
                {mobileOpen ? (
                    <div className="mt-3 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-3">
                        {navContent}
                    </div>
                ) : null}
            </div>
        </>
    );
}
