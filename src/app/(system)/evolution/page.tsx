import React from 'react';
import Link from 'next/link';
import { projectReportRepository } from '@/infra/repositories/project-report.repository';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export default async function EvolutionTimelinePage() {
    const reports = await projectReportRepository.getAllReports();

    return (
        <div className="min-h-screen bg-[var(--bg-app)] text-slate-900 font-sans selection:bg-blue-100">
            <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
                <header className="mb-16 border-b border-slate-100 pb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <span className="text-white font-bold text-xl">C</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Condstore Evolution</h1>
                    </div>
                    <p className="text-lg text-slate-500 leading-relaxed max-w-xl">
                        Acompanhe a jornada técnica e as melhorias contínuas da nossa plataforma de logística inteligente.
                    </p>
                    <div className="mt-8 flex gap-4">
                        <Link href="/evolution/roadmap" className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                            Ver Roadmap →
                        </Link>
                    </div>
                </header>

                {reports.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                        <p className="text-slate-400 font-medium">Aguardando primeira atualização...</p>
                    </div>
                ) : (
                    <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-100 before:to-transparent">
                        {reports.map((report, index) => (
                            <div key={report.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                                {/* Dot */}
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 text-slate-400 shadow-sm absolute left-0 md:left-1/2 md:-translate-x-1/2 z-10 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                    <span className="text-[10px] font-bold">{reports.length - index}</span>
                                </div>

                                {/* Content Card */}
                                <div className="w-[calc(100%-4rem)] md:w-[45%] bg-[var(--bg-app)] p-6 rounded-2xl border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50/50 transition-all duration-300 ml-auto md:ml-0">
                                    <div className="flex justify-between items-center mb-4">
                                        <time className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {format(new Date(report.createdAt), "d MMM yyyy", { locale: ptBR })}
                                        </time>
                                        <StatusBadge status={report.status} />
                                    </div>
                                    <Link href={`/evolution/${report.id}`} className="block group/title">
                                        <h2 className="text-lg font-bold text-slate-900 mb-2 group-hover/title:text-blue-600 transition-colors">
                                            {report.title}
                                        </h2>
                                    </Link>
                                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4">
                                        {report.summary}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[10px] font-bold px-2 py-1 bg-slate-50 text-slate-500 rounded-md uppercase tracking-tight">
                                            {report.moduleKey}
                                        </span>
                                        {report.tags && JSON.parse(report.tags).slice(0, 2).map((tag: string) => (
                                            <span key={tag} className="text-[10px] font-medium text-blue-500">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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
        <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${colors[status] || colors.planned}`}>
            {labels[status] || status}
        </span>
    );
}
