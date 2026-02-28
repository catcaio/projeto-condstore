'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { MODULES } from '@/config/modules';
import { findModuleForPath } from './route-guard';

export function ModuleBreadcrumb() {
    const pathname = usePathname();

    const activeModule = findModuleForPath(pathname) || MODULES.find(m => m.id === 'cockpit');

    if (!activeModule) {
        return (
            <div className="flex items-center text-xs font-medium text-[hsl(var(--ui-text-muted))] whitespace-nowrap overflow-hidden text-ellipsis">
                <span className="hidden sm:inline">CONDSTORE OS</span>
                <ChevronRight className="h-3.5 w-3.5 mx-1 hidden sm:inline" />
                <span className="text-[hsl(var(--ui-text))]">Workspace</span>
            </div>
        );
    }

    // Ache the exact route match for the title
    let subTitle = activeModule.label;

    for (const r of activeModule.routes) {
        const regexStr = r.pattern.replace(/:[^\s/]+/g, '([^/]+)');
        const regex = new RegExp(`^${regexStr}$`);
        if (regex.test(pathname)) {
            subTitle = r.title;
            break;
        }
    }

    // Fallback se n achou subTitle dinâmico? (Padrão: usa o label do módulo, mas pode estender pra último pathname)
    if (subTitle === activeModule.label && pathname !== activeModule.route) {
        const segments = pathname.split('/').filter(Boolean);
        const last = segments[segments.length - 1];
        if (last) {
            subTitle = `${activeModule.label} / ${last.toUpperCase()}`;
        }
    }

    return (
        <div className="flex items-center text-xs font-medium text-[hsl(var(--ui-text-muted))] whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="hidden sm:inline">CONDSTORE OS</span>
            <ChevronRight className="h-3.5 w-3.5 mx-1 hidden sm:inline opacity-50" />
            <span className="hidden sm:inline">{activeModule.group}</span>
            <ChevronRight className="h-3.5 w-3.5 mx-1 opacity-50" />
            <span className="text-[hsl(var(--ui-text))] truncate">{subTitle}</span>
        </div>
    );
}
