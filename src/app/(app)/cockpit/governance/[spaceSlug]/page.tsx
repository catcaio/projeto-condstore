import React from 'react';
import { GovernanceShell } from '@/modules/governance/components/governance-shell';
import Link from 'next/link';

export default async function SpacePage({ params }: { params: Promise<{ spaceSlug: string }> }) {
    const { spaceSlug } = await params;
    return (
        <GovernanceShell spaceSlug={spaceSlug}>
            <div className="p-10 max-w-6xl mx-auto w-full">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-8 capitalize">{spaceSlug} Space</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link href={`/cockpit/governance/${spaceSlug}/demo-project`} className="block bg-white dark:bg-[#131b2f] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-indigo-500/30 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                D
                            </div>
                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-md">Active</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2 transition-colors">Demo Project</h2>
                        <p className="text-sm text-slate-500 leading-relaxed">A standard project to demonstrate task management integration.</p>
                    </Link>
                </div>
            </div>
        </GovernanceShell>
    );
}
