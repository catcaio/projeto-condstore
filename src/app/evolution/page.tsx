import React from 'react';
import pkg from '../../../package.json';
import { getDb } from '@/infra/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic'; // Ensure server time and latest commits are fresh

interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
    html_url: string;
}

async function getCommits(): Promise<GitHubCommit[]> {
    try {
        const res = await fetch('https://api.github.com/repos/catcaio/projeto-condstore/commits?per_page=10', {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'Condstore-Evolution-Page',
            },
            next: { revalidate: 60 }, // Cache for 60 seconds
        });

        if (!res.ok) {
            return [];
        }

        return res.json();
    } catch (err) {
        console.error('Failed to fetch commits:', err);
        return [];
    }
}
async function getReports() {
    try {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl || (!dbUrl.includes('/lojacond') && !dbUrl.includes('localhost'))) {
            return { data: [], error: 'DB offline (Invalid Connection)' };
        }

        const db = await getDb();
        const reports = await db.execute(sql`SELECT title, summary, status, created_at FROM project_reports ORDER BY created_at DESC LIMIT 10`);
        const data = Array.isArray(reports) && Array.isArray(reports[0]) ? reports[0] : reports;
        return { data: data as any[], error: null };
    } catch (err) {
        console.error('Failed to fetch reports:', err);
        return { data: [], error: 'DB offline' };
    }
}

export default async function EvolutionPage() {
    const commitsPromise = getCommits();
    const reportsPromise = getReports();

    const [commits, { data: reports, error: dbError }] = await Promise.all([commitsPromise, reportsPromise]);
    const currentEnv = process.env.VERCEL_ENV || 'development';
    const serverTime = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">

                {/* Header */}
                <header className="border-b border-gray-200 pb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Condstore OS – Evolution
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Acompanhe o progresso, as versões e os últimos deploys da plataforma.
                    </p>
                </header>

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Versão</h3>
                        <p className="text-2xl font-semibold text-gray-900">v{pkg.version}</p>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ambiente</h3>
                        <div className="flex items-center space-x-2">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${currentEnv === 'production' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                            <p className="text-2xl font-semibold text-gray-900 capitalize">{currentEnv}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Hora do Servidor</h3>
                        <p className="text-sm font-medium text-gray-900">{serverTime}</p>
                        <p className="text-xs text-gray-500 mt-1">Horário de Brasília</p>
                    </div>
                </div>

                {/* Reports List */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">Reports do Projeto</h2>
                        {dbError && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {dbError}
                            </span>
                        )}
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {reports.length > 0 ? (
                            reports.map((r: any, idx: number) => (
                                <li key={idx} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col space-y-2">
                                        <div className="flex items-start justify-between">
                                            <span className="text-sm font-medium text-gray-900">{r.title}</span>
                                            <span className="text-xs font-mono text-gray-400 shrink-0 capitalize">{r.status}</span>
                                        </div>
                                        <p className="text-sm text-gray-500">{r.summary}</p>
                                        <span className="text-xs text-gray-400">
                                            {new Date(r.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                        </span>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="p-6 text-sm text-gray-500 text-center">
                                {dbError ? 'Não foi possível carregar os reports devido a falha no banco de dados.' : 'Nenhum report encontrado.'}
                            </li>
                        )}
                    </ul>
                </section>

                {/* Commits List */}
                <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-900">Últimos Commits</h2>
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {commits.length > 0 ? (
                            commits.map((c) => (
                                <li key={c.sha} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex flex-col space-y-2">
                                        <div className="flex items-start justify-between">
                                            <a
                                                href={c.html_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline line-clamp-2"
                                                title={c.commit.message}
                                            >
                                                {c.commit.message.split('\n')[0]}
                                            </a>
                                            <span className="text-xs font-mono text-gray-400 ml-4 shrink-0">
                                                {c.sha.substring(0, 7)}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-xs text-gray-500 space-x-2">
                                            <span className="font-medium text-gray-700">{c.commit.author.name}</span>
                                            <span>•</span>
                                            <span>{new Date(c.commit.author.date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                                        </div>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="p-6 text-sm text-gray-500 text-center">
                                Nenhum commit encontrado ou erro ao buscar do GitHub.
                            </li>
                        )}
                    </ul>
                </section>

            </div>
        </div>
    );
}
