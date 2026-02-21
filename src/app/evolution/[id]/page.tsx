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
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
            <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
                <header className="mb-16">
                    <Link href="/evolution" className="inline-flex items-center text-sm font-bold text-blue-600 mb-12 hover:gap-2 transition-all">
                        ← Voltar para Timeline
                    </Link>
                    
                    <div className="flex items-center gap-4 mb-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            {report.moduleKey}
                        </span>
                        <time className="text-xs font-medium text-slate-400">
                            {format(new Date(report.createdAt), "d 'de' MMMM, yyyy", { locale: ptBR })}
                        </time>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-8 leading-tight">
                        {report.title}
                    </h1>
                    
                    <div className="flex items-center gap-3">
                        <StatusBadge status={report.status} />
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                            Source: {report.source}
                        </span>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-12">
                    {/* Summary Section */}
                    <section className="prose prose-slate prose-lg max-w-none">
                        <div className="text-slate-600 leading-relaxed">
                            <ReactMarkdown>{report.summary}</ReactMarkdown>
                        </div>
                    </section>

                    <div className="h-px bg-slate-100 w-full" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Changes Section */}
                        {changes.length > 0 && (
                            <section>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Implementações</h3>
                                <ul className="space-y-4">
                                    {changes.map((change: string, i: number) => (
                                        <li key={i} className="text-sm text-slate-600 flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                                            <span>{change}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Next Actions Section */}
                        {nextActions.length > 0 && (
                            <section>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Próximos Passos</h3>
                                <ul className="space-y-4">
                                    {nextActions.map((action: string, i: number) => (
                                        <li key={i} className="text-sm text-slate-600 flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                            <span>{action}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* Metrics Section */}
                    {metrics && Object.keys(metrics).length > 0 && (
                        <section className="bg-slate-50 rounded-3xl p-8 md:p-12">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 text-center">Métricas de Impacto</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                                {Object.entries(metrics).map(([key, value]) => (
                                    <div key={key} className="text-center">
                                        <p className="text-3xl font-black text-slate-900 mb-1">{String(value)}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{key.replace('_', ' ')}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Risks Section */}
                    {risks.length > 0 && (
                        <section className="border border-rose-100 bg-rose-50/30 rounded-2xl p-6">
                            <h3 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span>⚠️</span> Pontos de Atenção
                            </h3>
                            <ul className="space-y-3">
                                {risks.map((risk: string, i: number) => (
                                    <li key={i} className="text-sm text-rose-700 font-medium">
                                        {risk}
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
        done: 'text-emerald-600 bg-emerald-50',
        in_progress: 'text-blue-600 bg-blue-50',
        planned: 'text-slate-500 bg-slate-50',
        blocked: 'text-rose-600 bg-rose-50',
    };

    const labels: Record<string, string> = {
        done: 'Concluído',
        in_progress: 'Em Curso',
        planned: 'Agendado',
        blocked: 'Pausado',
    };

    return (
        <span className={`text-[10px] font-black uppercase tracking-tight px-3 py-1 rounded-md ${colors[status] || colors.planned}`}>
            {labels[status] || status}
        </span>
    );
}
