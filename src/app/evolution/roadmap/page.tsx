import React from 'react';
import Link from 'next/link';
import { projectReportRepository } from '@/infra/repositories/project-report.repository';

export const dynamic = 'force-dynamic';

export default async function RoadmapPage() {
    const reports = await projectReportRepository.getAllReports();
    
    // Group by moduleKey and get latest status
    const modules: Record<string, { status: string, count: number, latestTitle: string }> = {};
    
    reports.forEach(r => {
        if (!modules[r.moduleKey]) {
            modules[r.moduleKey] = { status: r.status, count: 0, latestTitle: r.title };
        }
        modules[r.moduleKey].count++;
    });

    const moduleList = Object.entries(modules);

    return (
        <div className="min-h-screen bg-[#F2F2F7] dark:bg-black text-black dark:text-white font-sans p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8">
                    <Link href="/evolution" className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-4 inline-block active:opacity-50">
                        ← Voltar para Timeline
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">Roadmap de Evolução</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Progresso por módulo do sistema</p>
                </header>

                <div className="space-y-4">
                    {moduleList.length === 0 ? (
                        <p className="text-center text-slate-500 py-12">Nenhum dado de roadmap disponível.</p>
                    ) : (
                        moduleList.map(([key, data]) => (
                            <div key={key} className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-lg">{key}</h3>
                                    <StatusBadge status={data.status} />
                                </div>
                                <p className="text-xs text-slate-500 mb-4">Última atualização: {data.latestTitle}</p>
                                
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full ${data.status === 'done' ? 'bg-green-500' : 'bg-blue-500'}`} 
                                        style={{ width: data.status === 'done' ? '100%' : '60%' }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">{data.count} Relatórios</span>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">{data.status === 'done' ? '100%' : '60%'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
        blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[status] || colors.planned}`}>
            {status.toUpperCase()}
        </span>
    );
}
