'use client';

import React from 'react';
import Link from 'next/link';

export function ProjectSidebar({ spaceSlug, activeProjectSlug }: { spaceSlug: string; activeProjectSlug?: string }) {
    // In a real implementation this would fetch projects for the space
    return (
        <div className="p-3">
            <div className="text-xs font-semibold text-neutral-content uppercase tracking-wider mb-2 px-2">
                Projects
            </div>
            <nav className="space-y-1">
                <Link 
                    href={`/cockpit/governance/${spaceSlug}/core-platform`}
                    className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${activeProjectSlug === 'core-platform' ? 'bg-brand-primary/10 text-brand-primary font-medium' : 'text-neutral-dark dark:text-neutral-light hover:bg-neutral-subtle'}`}
                >
                    <span className="truncate">Core Platform</span>
                </Link>
                <Link 
                    href={`/cockpit/governance/${spaceSlug}/crm-operacao`}
                    className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${activeProjectSlug === 'crm-operacao' ? 'bg-brand-primary/10 text-brand-primary font-medium' : 'text-neutral-dark dark:text-neutral-light hover:bg-neutral-subtle'}`}
                >
                    <span className="truncate">CRM & Operação</span>
                </Link>
                <Link 
                    href={`/cockpit/governance/${spaceSlug}/logistica-frete`}
                    className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${activeProjectSlug === 'logistica-frete' ? 'bg-brand-primary/10 text-brand-primary font-medium' : 'text-neutral-dark dark:text-neutral-light hover:bg-neutral-subtle'}`}
                >
                    <span className="truncate">Logística & Frete</span>
                </Link>
            </nav>
        </div>
    );
}
