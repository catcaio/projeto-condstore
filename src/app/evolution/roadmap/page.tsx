import React from 'react';
import Link from 'next/link';
import { projectReportRepository } from '@/infra/repositories/project-report.repository';

export const dynamic = 'force-dynamic';

export default async function RoadmapPage() {
    const reports = await projectReportRepository.getAllReports();
    
    const modules: Record<string, { status: string, count: number, latestTitle: string }> = {};
    
    reports.forEach(r => {
        if (!modules[r.moduleKey]) {
            modules[r.moduleKey] = { status: r.status, count: 0, latestTitle: r.title };
        }
        modules[r.moduleKey].count++;
    });

    const moduleList = Object.entries(modules);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
            <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
                <header className="mb-16">
                    <Link href="/evolution" className="inline-flex items-center text-sm font-bold text-blue-600 mb-12 hover:gap-2 transition-all">
                        ← Voltar para Timeline
                    </Link>
                    <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">Roadmap Estratégico</h1>
                    <p className="text-lg text-slate-500 leading-relaxed">Visão consolidada do progresso por módulo do sistema.</p>
                </header>

                <div className="grid grid-cols-1 gap-6">
                    {moduleList.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                            <p className="text-slate-400 font-medium">Nenhum dado de roadmap disponível.</p>
                        </div>
                    ) : (
                        moduleList.map(([key, data]) => (
                            <div key={key} className="group bg-white p-8 rounded-3xl border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-300">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-black text-xl tracking-tight text-slate-900">{key}</h3>
                                    <StatusBadge status={data.status} />
                                </div>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progresso Atual</p>
                                        <p className="text-sm font-black text-slate-900">{data.status === 'done' ? '100%' : '75%'}</p>
                                    </div>
                                    <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden p-0.5 border border-slate-100">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${data.status === 'done' ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                                            style={{ width: data.status === 'done' ? '100%' : '75%' }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-600" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{data.count} Atualizações</span>
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-400 italic">Última: {data.latestTitle}</p>
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
        done: 'text-emerald-600 bg-emerald-50',
        in_progress: 'text-blue-600 bg-blue-50',
        planned: 'text-slate-500 bg-slate-50',
        blocked: 'text-rose-600 bg-rose-50',
    };

    return (
        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${colors[status] || colors.planned}`}>
            {status}
        </span>
    );
}
