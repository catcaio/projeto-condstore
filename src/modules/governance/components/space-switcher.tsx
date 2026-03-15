'use client';

import React from 'react';
import Link from 'next/link';

export function SpaceSwitcher({ currentSpaceSlug }: { currentSpaceSlug?: string }) {
    // In a real implementation this would fetch spaces from GET /api/cockpit/governance/spaces
    return (
        <Link href="/cockpit/governance" className="flex items-center space-x-2 w-full hover:bg-slate-100 dark:hover:bg-neutral-subtle p-2 rounded-md transition-colors">
            <div className="w-6 h-6 rounded bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                G
            </div>
            <span className="font-semibold text-sm truncate">
                {currentSpaceSlug ? `Space: ${currentSpaceSlug}` : 'Governance Home'}
            </span>
        </Link>
    );
}
