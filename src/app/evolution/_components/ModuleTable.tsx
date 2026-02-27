import React, { useMemo, useState } from 'react';
import { ProjectReport } from '../types';
import { formatTimeRelative } from '../utils';

interface ModuleTableProps {
    reports: ProjectReport[];
    days: number;
    activeModulesFilter: string[];
    onFilterModule: (mod: string) => void;
}

export function ModuleTable({ reports, days, activeModulesFilter, onFilterModule }: ModuleTableProps) {
    const [sortCol, setSortCol] = useState<'module' | 'count' | 'last_update' | 'progress'>('last_update');
    const [sortDesc, setSortDesc] = useState(true);

    const modules = useMemo(() => {
        const map = new Map<string, { count: number, lastTime: number, done: number }>();
        reports.forEach(r => {
            const m = r.module_key;
            if (!map.has(m)) map.set(m, { count: 0, lastTime: 0, done: 0 });
            const curr = map.get(m)!;
            curr.count++;
            if (r.status === 'done') curr.done++;
            const t = new Date(r.created_at).getTime();
            if (t > curr.lastTime) curr.lastTime = t;
        });

        const maxStaleDays = days / 3;
        const now = Date.now();

        const rows = Array.from(map.entries()).map(([key, data]) => {
            const staleDays = (now - data.lastTime) / 86400000;
            const status = staleDays > maxStaleDays ? 'warn' : 'ok';
            const progress = data.count > 0 ? (data.done / data.count) * 100 : 0;

            return {
                key,
                count: data.count,
                progress,
                lastTime: data.lastTime,
                status
            };
        });

        rows.sort((a, b) => {
            let valA, valB;
            if (sortCol === 'module') {
                valA = a.key; valB = b.key;
            } else if (sortCol === 'count') {
                valA = a.count; valB = b.count;
            } else if (sortCol === 'progress') {
                valA = a.progress; valB = b.progress;
            } else {
                valA = a.lastTime; valB = b.lastTime;
            }

            if (valA < valB) return sortDesc ? 1 : -1;
            if (valA > valB) return sortDesc ? -1 : 1;
            return 0;
        });

        return rows;
    }, [reports, days, sortCol, sortDesc]);

    const handleSort = (col: typeof sortCol) => {
        if (sortCol === col) setSortDesc(!sortDesc);
        else { setSortCol(col); setSortDesc(true); }
    };

    const Th = ({ col, label }: { col: typeof sortCol, label: string }) => (
        <th
            className="pb-2 text-left font-semibold cursor-pointer hover:text-white transition-colors select-none"
            onClick={() => handleSort(col)}
        >
            <div className="flex items-center space-x-1">
                <span>{label}</span>
                {sortCol === col && (
                    <span className="text-[10px]">{sortDesc ? '▼' : '▲'}</span>
                )}
            </div>
        </th>
    );

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-[10px] uppercase text-[var(--text-secondary)] tracking-wider font-semibold mb-3">Module Health</h3>

            <div className="flex-1 overflow-auto overflow-x-hidden min-h-[200px]">
                <table className="w-full text-xs text-left">
                    <thead className="text-[9px] uppercase text-[var(--text-secondary)] sticky top-0 bg-[#111] z-10">
                        <tr>
                            <Th col="module" label="Module" />
                            <Th col="progress" label="Prog" />
                            <Th col="count" label="Evts" />
                            <Th col="last_update" label="Last Updated" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                        {modules.length === 0 && (
                            <tr><td colSpan={4} className="py-4 text-center text-[var(--text-secondary)]">No active modules</td></tr>
                        )}
                        {modules.map((m) => {
                            const isActive = activeModulesFilter.includes(m.key);
                            return (
                                <tr
                                    key={m.key}
                                    onClick={() => onFilterModule(m.key)}
                                    className={`cursor-pointer transition-colors group ${isActive ? 'bg-blue-900/10' : 'hover:bg-[var(--bg-panel)]'}`}
                                >
                                    <td className="py-2.5 flex items-center space-x-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'warn' ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'bg-emerald-500'} ${isActive ? 'animate-pulse' : ''}`}></div>
                                        <span className={`font-mono truncate max-w-[100px] ${isActive ? 'text-blue-400 font-bold' : 'text-[var(--text-secondary)] group-hover:text-blue-300'}`}>
                                            {m.key}
                                        </span>
                                    </td>
                                    <td className="py-2.5">
                                        <div className="flex items-center space-x-1 w-12">
                                            <div className="flex-1 h-1.5 bg-[var(--bg-panel)] rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${m.progress}%` }}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2.5 text-[var(--text-secondary)] font-mono">{m.count}</td>
                                    <td className="py-2.5 text-[var(--text-secondary)] font-mono">{formatTimeRelative(m.lastTime)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 text-[9px] text-[var(--text-secondary)]">
                Tip: Click a module to drill-down.
            </div>
        </div>
    );
}
