import React from 'react';
import { GovernanceShell } from '@/modules/governance/components/governance-shell';
import Link from 'next/link';

export default function GovernanceSpaceIndex() {
    return (
        <GovernanceShell>
            <div className="p-8 flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-6 shadow-sm">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-neutral-dark dark:text-neutral-light mb-3">Governance Cockpit</h2>
                <p className="text-neutral-content max-w-md mb-10 text-sm leading-relaxed">
                    Select a space to view your projects and start managing operational tasks seamlessly linked to the CONDSTORE ecosystem.
                </p>
                
                {/* Minimal KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl w-full">
                    <div className="bg-base-surface p-6 rounded-2xl border border-neutral-border shadow-sm hover:shadow-md transition">
                        <div className="text-3xl font-bold text-brand-primary mb-2">12</div>
                        <div className="text-[10px] font-bold text-neutral-content uppercase tracking-widest">Abertas</div>
                    </div>
                    <div className="bg-base-surface p-6 rounded-2xl border border-neutral-border shadow-sm hover:shadow-md transition">
                        <div className="text-3xl font-bold text-red-500 mb-2">3</div>
                        <div className="text-[10px] font-bold text-neutral-content uppercase tracking-widest">Atrasadas</div>
                    </div>
                    <div className="bg-base-surface p-6 rounded-2xl border border-neutral-border shadow-sm hover:shadow-md transition">
                        <div className="text-3xl font-bold text-amber-500 mb-2">1</div>
                        <div className="text-[10px] font-bold text-neutral-content uppercase tracking-widest">Bloqueadas</div>
                    </div>
                    <div className="bg-base-surface p-6 rounded-2xl border border-neutral-border shadow-sm hover:shadow-md transition">
                        <div className="text-3xl font-bold text-emerald-500 mb-2">24</div>
                        <div className="text-[10px] font-bold text-neutral-content uppercase tracking-widest">Concluídas (Semana)</div>
                    </div>
                </div>
                
                <div className="mt-12 text-sm text-neutral-content">
                    <p>Spaces Disponíveis:</p>
                    <div className="flex gap-4 mt-4 justify-center">
                        <Link href="/cockpit/governance/hq" className="px-4 py-2 bg-base-surface border border-neutral-border rounded-lg shadow-sm font-semibold hover:border-brand-primary text-neutral-dark dark:text-neutral-light">
                            HQ Space
                        </Link>
                    </div>
                </div>
            </div>
        </GovernanceShell>
    );
}
