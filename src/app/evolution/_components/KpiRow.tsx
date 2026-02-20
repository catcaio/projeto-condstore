import React from 'react';
import { ProjectReport } from '../types';

interface KpiRowProps {
    reports: ProjectReport[];
    days: number;
    lastRefresh: string;
}

export function KpiRow({ reports, days, lastRefresh }: KpiRowProps) {
    const total = reports.length;
    const avg = total > 0 ? (total / days).toFixed(1) : '0.0';

    const uniqueModules = new Set(reports.map(r => r.module_key)).size;
    const doneReports = reports.filter(r => r.status === 'done').length;
    const completion = total > 0 ? ((doneReports / total) * 100).toFixed(0) : '0';

    let lastAge = 'n/a';
    if (reports.length > 0) {
        const lastTime = new Date(reports[0].created_at).getTime();
        const diff = Math.max(0, Date.now() - lastTime);
        const mins = Math.floor(diff / 60000);
        if (mins < 60) lastAge = `${mins}m ago`;
        else lastAge = `${Math.floor(mins / 60)}h ago`;
    }

    const _kpiCard = (title: string, val: string | number, sub: string) => (
        <div className="bg-[#111] border border-gray-800 rounded px-4 py-3 flex flex-col justify-between hover:border-gray-700 transition-colors">
            <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">{title}</h4>
            <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-semibold text-gray-100 font-mono tracking-tight">{val}</span>
                <span className="text-[10px] text-gray-600 font-mono uppercase">{sub}</span>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
            {_kpiCard('Total Events', total, `Last ${days}d`)}
            {_kpiCard('Throughput', avg, 'evt/day')}
            {_kpiCard('Active Modules', uniqueModules, 'unique')}
            {_kpiCard('Completion', `${completion}%`, 'ratio')}
            {_kpiCard('Latency', lastAge, 'last evt')}

            <div className="bg-[#111] border border-gray-800 rounded px-4 py-3 flex flex-col justify-between hover:border-gray-700 transition-colors">
                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">State Sync</h4>
                <div className="flex items-baseline space-x-2">
                    <span className="text-xs text-green-400 font-mono tracking-tight truncate flex items-center">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                        {lastRefresh}
                    </span>
                </div>
            </div>
        </div>
    );
}
