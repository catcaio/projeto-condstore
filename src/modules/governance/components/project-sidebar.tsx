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
                    href={`/cockpit/governance/${spaceSlug}/demo-project`}
                    className={`flex items-center px-2 py-1.5 text-sm rounded-md transition-colors ${activeProjectSlug === 'demo-project' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-neutral-subtle'}`}
                >
                    <span className="truncate">Demo Project</span>
                </Link>
            </nav>
        </div>
    );
}
