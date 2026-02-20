import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { projectReportRepository } from '@/infra/repositories/project-report.repository';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

export const dynamic = 'force-dynamic';

export default async function EvolutionDetailPage({ params }: { params: { id: string } }) {
    const report = await projectReportRepository.getReportById(params.id);

    if (!report) {
        notFound();
    }

    const changes = report.changes ? JSON.parse(report.changes) : [];
    const metrics = report.metrics ? JSON.parse(report.metrics) : null;
    const risks = report.risks ? JSON.parse(report.risks) : [];
    const nextActions = report.nextActions ? JSON.parse(report.nextActions) : [];

    return (
        <div className="min-h-screen bg-[#F2F2F7] dark:bg-black text-black dark:text-white font-sans p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8">
                    <Link href="/evolution" className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-4 inline-block active:opacity-50">
                        ← Voltar para Timeline
                    </Link>
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                            {report.moduleKey}
                        </span>
                        <span className="text-xs text-slate-400">
                            {format(new Date(report.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-4">{report.title}</h1>
                    <div className="flex items-center gap-2">
                        <StatusBadge status={report.status} />
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
                            Source: {report.source}
                        </span>
                    </div>
                </header>

                <div className="space-y-6">
                    {/* Summary Section */}
                    <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Resumo</h3>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{report.summary}</ReactMarkdown>
                        </div>
                    </section>

                    {/* Changes Section */}
                    {changes.length > 0 && (
                        <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Mudanças</h3>
                            <ul className="space-y-2">
                                {changes.map((change: string, i: number) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                        <span className="text-blue-500 mt-1">•</span>
                                        <span>{change}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Metrics Section */}
                    {metrics && Object.keys(metrics).length > 0 && (
                        <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Métricas</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(metrics).map(([key, value]) => (
                                    <div key={key} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">{key}</p>
                                        <p className="text-lg font-bold">{String(value)}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Risks Section */}
                    {risks.length > 0 && (
                        <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Riscos</h3>
                            <ul className="space-y-2">
                                {risks.map((risk: string, i: number) => (
                                    <li key={i} className="text-sm flex items-start gap-2 text-red-600 dark:text-red-400">
                                        <span className="mt-1">⚠️</span>
                                        <span>{risk}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Next Actions Section */}
                    {nextActions.length > 0 && (
                        <section className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Próximos Passos</h3>
                            <ul className="space-y-2">
                                {nextActions.map((action: string, i: number) => (
                                    <li key={i} className="text-sm flex items-start gap-2">
                                        <span className="text-green-500 mt-1">→</span>
                                        <span>{action}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
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
