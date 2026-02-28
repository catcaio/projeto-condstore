'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { MODULES } from '@/config/modules';

export function ModuleBreadcrumb() {
    const pathname = usePathname();

    // Sort modules by length of route descending so more specific routes match first
    const sortedModules = [...MODULES].sort((a, b) => b.route.length - a.route.length);

    let activeModule = sortedModules.find(m => pathname === m.route);
    if (!activeModule) {
        activeModule = sortedModules.find(m => pathname.startsWith(`${m.route}/`));
    }

    // Se não tem módulo e estamos no /cockpit, padrão
    if (!activeModule && pathname.startsWith('/cockpit')) {
        activeModule = MODULES.find(m => m.id === 'cockpit');
    }

    if (!activeModule) {
        return (
            <div className="flex items-center text-xs font-medium text-[hsl(var(--ui-text-muted))] whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="hidden sm:inline">CONDSTORE OS</span>
                <ChevronRight className="h-3.5 w-3.5 mx-1 hidden sm:inline" />
                <span className="text-[hsl(var(--ui-text))]">Workspace</span>
            </div>
        );
    }

    return (
        <div className="flex items-center text-xs font-medium text-[hsl(var(--ui-text-muted))] whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="hidden sm:inline">CONDSTORE OS</span>
            <ChevronRight className="h-3.5 w-3.5 mx-1 hidden sm:inline opacity-50" />
            <span className="hidden sm:inline">{activeModule.group}</span>
            <ChevronRight className="h-3.5 w-3.5 mx-1 opacity-50" />
            <span className="text-[hsl(var(--ui-text))] truncate">{activeModule.label}</span>
        </div>
    );
}
