import React from 'react';
import { GovernanceShell } from '@/modules/governance/components/governance-shell';

export default function GovernanceSpaceIndex() {
    return (
        <GovernanceShell>
            <div className="p-8 flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-500 flex items-center justify-center mb-6 shadow-sm">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-3">Governance Cockpit</h2>
                <p className="text-slate-500 max-w-md mb-10 text-sm leading-relaxed">
                    Select a space to view your projects and start managing operational tasks seamlessly linked to the CONDSTORE ecosystem.
                </p>
                <div className="grid grid-cols-2 gap-6 max-w-lg w-full">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
                        <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">12</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Open Tasks</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
                        <div className="text-4xl font-bold text-rose-500 dark:text-rose-400 mb-2">3</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Overdue</div>
                    </div>
                </div>
            </div>
        </GovernanceShell>
    );
}
