"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectReport, GitHubCommit } from './types';
import { useDashboardState } from './useDashboardState';
import { TopBar } from './_components/TopBar';
import { KpiRow } from './_components/KpiRow';
import { DbBanner } from './_components/DbBanner';
import { TrendChart } from './_components/TrendChart';
import { Heatmap } from './_components/Heatmap';
import { TimelineVirtual } from './_components/TimelineVirtual';
import { ModuleTable } from './_components/ModuleTable';
import { CommitsPanel } from './_components/CommitsPanel';
import { EmptyState } from './_components/EmptyState';

interface DashboardProps {
    initialReports: ProjectReport[];
    commits: GitHubCommit[];
    buildInfo: any;
    dbError: string | null;
}

function DashboardInner({ initialReports, commits, buildInfo, dbError }: DashboardProps) {
    const { state, updateState, toggleArrayItem, filteredReports } = useDashboardState(initialReports);
    const days = parseInt(state.range.replace('d', ''), 10);

    const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString('pt-BR', { hour12: false }));
    const router = useRouter();

    useEffect(() => {
        setLastRefresh(new Date().toLocaleTimeString('pt-BR', { hour12: false }));
    }, [initialReports]);

    useEffect(() => {
        if (!state.autoRefresh) return;
        const interval = setInterval(() => {
            router.refresh(); // Triggers server re-fetch silently
        }, 60000);
        return () => clearInterval(interval);
    }, [state.autoRefresh, router]);

    return (
        <div className="min-h-screen bg-[#09090b] text-[var(--text-secondary)] font-sans selection:bg-blue-500/30">
            <DbBanner error={dbError} />
            <TopBar state={state} updateState={updateState} buildInfo={buildInfo} dbError={dbError} />

            <main className="p-4 max-w-[1800px] mx-auto space-y-4">
                <KpiRow reports={filteredReports} days={days} lastRefresh={lastRefresh} />

                {/* Grid Layout for Observability feel */}
                {filteredReports.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

                        {/* Visualizations Column (Heatmap + Trend) */}
                        <div className="xl:col-span-8 flex flex-col space-y-5">
                            <div className="bg-[#111] border border-[var(--border-default)] rounded h-48 flex items-center justify-center p-3 shadow-md">
                                <TrendChart reports={filteredReports} days={days} />
                            </div>
                            <div className="bg-[#111] border border-[var(--border-default)] rounded flex items-center justify-center p-3 shadow-md pb-0">
                                <Heatmap reports={filteredReports} days={days} />
                            </div>
                            <div className="min-h-96 flex flex-col pt-1">
                                <TimelineVirtual reports={filteredReports} onTagClick={(t) => toggleArrayItem('tags', t)} />
                            </div>
                        </div>

                        {/* Side Panel (Modules Health + Commits) */}
                        <div className="xl:col-span-4 flex flex-col space-y-5">
                            <div className="bg-[#111] border border-[var(--border-default)] rounded min-h-64 flex flex-col p-4 shadow-md max-h-[500px]">
                                <ModuleTable
                                    reports={filteredReports}
                                    days={days}
                                    activeModulesFilter={state.modules}
                                    onFilterModule={(m) => toggleArrayItem('modules', m)}
                                />
                            </div>
                            <div className="bg-[#111] border border-[var(--border-default)] rounded min-h-64 flex flex-col p-4 shadow-md max-h-[700px]">
                                <CommitsPanel commits={commits} />
                            </div>
                        </div>

                    </div>
                )}
            </main>

            {/* Background static grid for observability feel */}
            <div className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.03]" style={{ backgroundImage: `linear-gradient(var(--bg-app) 1px, transparent 1px), linear-gradient(90deg, var(--bg-app) 1px, transparent 1px)`, backgroundSize: '40px 40px' }}></div>
        </div>
    );
}

export function DashboardClient(props: DashboardProps) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#09090b] p-6 font-mono text-blue-500 text-sm flex items-center"><span className="animate-pulse">Loading Observability Cockpit...</span></div>}>
            <DashboardInner {...props} />
        </Suspense>
    );
}
