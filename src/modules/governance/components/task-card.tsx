'use client';

import React from 'react';
import Link from 'next/link';

export function TaskCard({ title, id }: { title: string, id: string }) {
    return (
        <Link 
            href={`/cockpit/governance/task/${id}`} 
            className="block border border-neutral-border dark:border-neutral-border bg-base-surface dark:bg-neutral-subtle p-4 rounded-xl shadow-sm hover:shadow-md transition-all hover:border-brand-primary dark:hover:border-brand-primary cursor-pointer group"
        >
            <div className="text-xs font-medium text-neutral-content dark:text-neutral-content mb-1 flex justify-between">
                <span>{id}</span>
                <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700"></span>
            </div>
            <h4 className="font-semibold text-slate-800 dark:text-neutral-light leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {title}
            </h4>
        </Link>
    );
}
