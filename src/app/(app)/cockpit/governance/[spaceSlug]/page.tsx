import React from 'react';
import { GovernanceShell } from '@/modules/governance/components/governance-shell';
import Link from 'next/link';

export default async function SpacePage({ params }: { params: Promise<{ spaceSlug: string }> }) {
    const { spaceSlug } = await params;
    return (
        <GovernanceShell spaceSlug={spaceSlug}>
            <div className="p-10 max-w-6xl mx-auto w-full">
                {/* Breadcrumbs */}
                <div className="text-sm font-medium text-neutral-content mb-4 flex items-center space-x-2">
                    <Link href="/cockpit/governance" className="hover:text-brand-primary">Governance</Link>
                    <span>/</span>
                    <span className="capitalize">{spaceSlug}</span>
                </div>
                
                <h1 className="text-3xl font-bold text-neutral-dark dark:text-neutral-light mb-8 capitalize">{spaceSlug} Space</h1>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link href={`/cockpit/governance/${spaceSlug}/core-platform`} className="block bg-base-surface p-6 rounded-2xl border border-neutral-border shadow-sm hover:shadow-lg hover:border-brand-primary/50 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
                                C
                            </div>
                            <span className="text-xs font-semibold text-neutral-content bg-neutral-subtle px-2 py-1 rounded-md">Active</span>
                        </div>
                        <h2 className="text-lg font-bold text-neutral-dark dark:text-neutral-light group-hover:text-brand-primary mb-2 transition-colors">Core Platform</h2>
                        <p className="text-sm text-neutral-content leading-relaxed">System infrastructure, backend, and core modules.</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-content">
                            <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-1"></div>2 open</span>
                        </div>
                    </Link>

                    <Link href={`/cockpit/governance/${spaceSlug}/crm-operacao`} className="block bg-base-surface p-6 rounded-2xl border border-neutral-border shadow-sm hover:shadow-lg hover:border-brand-primary/50 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                                O
                            </div>
                            <span className="text-xs font-semibold text-neutral-content bg-neutral-subtle px-2 py-1 rounded-md">Active</span>
                        </div>
                        <h2 className="text-lg font-bold text-neutral-dark dark:text-neutral-light group-hover:text-brand-primary mb-2 transition-colors">CRM & Operação</h2>
                        <p className="text-sm text-neutral-content leading-relaxed">Customer success, follow-ups, and daily operation tasks.</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-content">
                            <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>1 overdue</span>
                        </div>
                    </Link>
                    
                    <Link href={`/cockpit/governance/${spaceSlug}/logistica-frete`} className="block bg-base-surface p-6 rounded-2xl border border-neutral-border shadow-sm hover:shadow-lg hover:border-brand-primary/50 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                                L
                            </div>
                            <span className="text-xs font-semibold text-neutral-content bg-neutral-subtle px-2 py-1 rounded-md">Active</span>
                        </div>
                        <h2 className="text-lg font-bold text-neutral-dark dark:text-neutral-light group-hover:text-brand-primary mb-2 transition-colors">Logística & Frete</h2>
                        <p className="text-sm text-neutral-content leading-relaxed">Tracking, carrier issues, and freight simulations management.</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-neutral-content">
                            <span className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-1"></div>3 blocked</span>
                        </div>
                    </Link>
                </div>
            </div>
        </GovernanceShell>
    );
}
