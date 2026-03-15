'use client';

import React from 'react';
import Link from 'next/link';

export function TaskCard({ title, id, priority = 'normal', label }: { title: string, id: string, priority?: 'low' | 'normal' | 'high' | 'urgent', label?: string }) {
    const priorityColor = {
        'low': 'bg-blue-400',
        'normal': 'bg-slate-400',
        'high': 'bg-amber-500',
        'urgent': 'bg-red-500'
    }[priority];

    return (
        <Link 
            href={`/cockpit/governance/task/${id}`} 
            className="block border border-neutral-border dark:border-neutral-border bg-base-surface dark:bg-neutral-subtle p-4 rounded-xl shadow-sm hover:shadow-md transition-all hover:border-brand-primary dark:hover:border-brand-primary cursor-pointer group"
        >
            <div className="flex flex-wrap gap-2 mb-2">
                {label && (
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-brand-primary/10 text-brand-primary">
                        {label}
                    </span>
                )}
            </div>
            <div className="text-xs font-medium text-neutral-content dark:text-neutral-content mb-1 flex justify-between items-center">
                <span>{id}</span>
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${priorityColor}`} title={`Priority: ${priority}`}></span>
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                </div>
            </div>
            <h4 className="font-semibold text-slate-800 dark:text-neutral-light leading-snug group-hover:text-brand-primary transition-colors">
                {title}
            </h4>
        </Link>
    );
}
