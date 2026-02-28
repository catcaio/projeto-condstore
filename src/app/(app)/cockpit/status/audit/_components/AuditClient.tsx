'use client';

import { useState, useCallback, useEffect } from 'react';

export function AuditClient({ tenantId }: { tenantId: string }) {
    const [dataset, setDataset] = useState<'admin' | 'incident'>('admin');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // pagination & filters
    const [page, setPage] = useState(1);
    const [actionFilter, setActionFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                type: dataset,
                page: String(page),
                limit: '20'
            });
            if (actionFilter) params.append('action', actionFilter);
            if (userFilter) params.append('userId', userFilter);

            const res = await fetch(`/api/tenants/${tenantId}/audit?${params.toString()}`);
            if (res.ok) {
                const j = await res.json();
                setData(j.data || []);
            }
        } catch (e) {
            console.error('Failed to load audit data');
        } finally {
            setLoading(false);
        }
    }, [tenantId, dataset, page, actionFilter, userFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleNext = () => setPage(p => p + 1);
    const handlePrev = () => setPage(p => Math.max(1, p - 1));

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-end bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Dataset</label>
                    <select
                        value={dataset}
                        onChange={(e) => { setDataset(e.target.value as 'admin' | 'incident'); setPage(1); }}
                        className="bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 focus:ring-1 focus:ring-zinc-600 outline-none w-full"
                    >
                        <option value="admin">Admin Actions (Audit)</option>
                        <option value="incident">Kill Switch / Incidents</option>
                    </select>
                </div>

                <div className="flex flex-col gap-1 w-full md:w-auto flex-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Filtro Ação / Tipo</label>
                    <input
                        type="text"
                        placeholder="Ex: SECRET_ROTATED"
                        value={actionFilter}
                        onChange={e => setActionFilter(e.target.value)}
                        className="bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 outline-none w-full"
                    />
                </div>

                <div className="flex flex-col gap-1 w-full md:w-auto flex-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Filtro User ID</label>
                    <input
                        type="text"
                        placeholder="Ex: u-xyz"
                        value={userFilter}
                        onChange={e => setUserFilter(e.target.value)}
                        className="bg-black border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-300 outline-none w-full"
                    />
                </div>
                <button
                    onClick={() => setPage(1)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 font-medium rounded text-sm transition">
                    Filtrar
                </button>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-black flex flex-col min-h-[400px]">
                {loading ? (
                    <div className="p-8 text-center text-zinc-500 animate-pulse text-sm">Carregando logs...</div>
                ) : data.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 text-sm">Nenhum evento encontrado.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-zinc-300">
                            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                                <tr>
                                    <th className="font-semibold p-4">Time (UTC)</th>
                                    <th className="font-semibold p-4">User / Actor</th>
                                    <th className="font-semibold p-4">Action / Type</th>
                                    <th className="font-semibold p-4">Metadata</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {data.map((item: any, idx) => (
                                    <tr key={idx} className="hover:bg-zinc-900/40 transition">
                                        <td className="p-4 whitespace-nowrap text-zinc-400">
                                            {new Date(item.createdAt || item.startedAt).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-mono text-xs">{item.userId || item.triggeredBy || 'system'}</td>
                                        <td className="p-4 text-emerald-400 font-medium">
                                            {item.action || item.type}
                                        </td>
                                        <td className="p-4 text-xs font-mono text-zinc-500 break-all max-w-[300px]">
                                            {JSON.stringify(item.metadata || '{}')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center text-zinc-400 text-sm">
                <span>Página {page}</span>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrev}
                        disabled={page <= 1}
                        className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 disabled:opacity-50"
                    >
                        &laquo; Anterior
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={data.length < 20}
                        className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded hover:bg-zinc-800 disabled:opacity-50"
                    >
                        Próxima &raquo;
                    </button>
                </div>
            </div>
        </div>
    );
}
