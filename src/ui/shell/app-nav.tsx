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
                group relative flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150
                md:justify-center md:px-0 md:h-11 md:w-11 md:rounded-xl md:mb-1
                ${isActive
                    ? 'bg-[hsl(var(--ui-accent-blue)/0.08)] text-[hsl(var(--ui-accent-blue))] font-medium md:bg-[hsl(var(--ui-accent-blue)/0.12)]'
                    : 'text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-bg)/0.8)] hover:text-[hsl(var(--ui-text))]'
                }
            `}
        >
            <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md md:bg-transparent md:shadow-none md:ring-0 ${isActive ? 'bg-white text-[hsl(var(--ui-accent-blue))] shadow-sm ring-1 ring-black/5' : 'bg-transparent group-hover:bg-white group-hover:shadow-sm group-hover:ring-1 group-hover:ring-black/5 md:group-hover:bg-transparent md:group-hover:shadow-none'}`}>
                <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm md:hidden">
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
        <nav className="flex h-full w-full flex-col gap-8 md:items-center">
            {navGroups.map((group) => (
                <div key={group.key} className="flex flex-col items-center w-full">
                    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))] md:hidden w-full">
                        {group.title}
                    </p>
                    <div className="flex mb-4 md:mb-0 flex-col gap-1.5 w-full items-center">
                        {group.items.map((item) => (
                            <NavLink key={item.id} item={item} pathname={pathname} />
                        ))}
                    </div>
                </div>
            ))}

            <div className="mt-auto flex w-full flex-col items-center gap-3 border-t border-[hsl(var(--ui-border))] pt-6 md:border-none">
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
                    className="flex items-center gap-2 rounded-lg px-3 py-2 md:px-0 md:justify-center md:h-11 md:w-11 text-sm text-[hsl(var(--ui-text-muted))] hover:bg-red-50 hover:text-red-600 focus:outline-none transition-colors text-left group relative"
                >
                    {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
                    <span className="md:hidden">Sair</span>
                    
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
