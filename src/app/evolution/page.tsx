import React from 'react';
import Link from 'next/link';
import { projectReportRepository } from '@/infra/repositories/project-report.repository';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';
export const revalidate = 60; // 60s cache

export default async function EvolutionTimelinePage() {
    const reports = await projectReportRepository.getAllReports();

    return (
        <div className="min-h-screen bg-[#F2F2F7] dark:bg-black text-black dark:text-white font-sans p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Evolução do Projeto</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Linha do tempo de atualizações e auditorias</p>
                </header>

                {reports.length === 0 ? (
                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500">Nenhum relatório enviado ainda.</p>
                        <p className="text-xs mt-2 text-slate-400">Use a API /api/reports/ingest para começar.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {reports.map((report) => (
                            <Link 
                                key={report.id} 
                                href={`/evolution/${report.id}`}
                                className="block bg-white dark:bg-[#1C1C1E] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 active:scale-[0.98] transition-transform shadow-sm"
                            >
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                                            {report.moduleKey}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            {format(new Date(report.createdAt), "d 'de' MMMM", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <h2 className="text-lg font-semibold leading-tight mb-2">{report.title}</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                                        {report.summary}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={report.status} />
                                        {report.tags && JSON.parse(report.tags).map((tag: string) => (
                                            <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
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

    const labels: Record<string, string> = {
        done: 'Concluído',
        in_progress: 'Em Progresso',
        planned: 'Planejado',
        blocked: 'Bloqueado',
    };

    return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[status] || colors.planned}`}>
            {labels[status] || status}
        </span>
    );
}
