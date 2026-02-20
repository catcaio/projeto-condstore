import React, { useMemo } from 'react';
import { ProjectReport } from '../types';
import { getDateDaysAgo, cn } from '../utils';

interface HeatmapProps {
    reports: ProjectReport[];
    days: number;
}

export function Heatmap({ reports, days }: HeatmapProps) {
    const grid = useMemo(() => {
        const blocks = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Count reports per day
        const counts = new Map<string, number>();
        let maxCount = 0;
        reports.forEach(r => {
            const d = new Date(r.created_at);
            d.setHours(0, 0, 0, 0);
            const key = d.getTime().toString();
            const c = (counts.get(key) || 0) + 1;
            counts.set(key, c);
            if (c > maxCount) maxCount = c;
        });

        // Generate blocks from `days` ago to today
        for (let i = days - 1; i >= 0; i--) {
            const d = getDateDaysAgo(i);
            const ts = d.getTime().toString();
            const count = counts.get(ts) || 0;
            blocks.push({
                date: d.toLocaleDateString('pt-BR'),
                count,
                intensity: maxCount > 0 ? count / maxCount : 0
            });
        }
        return blocks;
    }, [reports, days]);

    const getColor = (intensity: number) => {
        if (intensity === 0) return 'bg-[#1a1a1a]';
        if (intensity < 0.25) return 'bg-blue-900/60';
        if (intensity < 0.5) return 'bg-blue-700/80';
        if (intensity < 0.75) return 'bg-blue-500';
        return 'bg-blue-400';
    };

    return (
        <div className="w-full flex justify-end overflow-hidden pb-4">
            <div
                className="grid gap-[3px]"
                style={{
                    gridTemplateRows: 'repeat(7, 12px)',
                    gridAutoFlow: 'column',
                    gridAutoColumns: '12px'
                }}
            >
                {grid.map((b, i) => (
                    <div
                        key={i}
                        className={cn("w-3 h-3 rounded-[2px] transition-colors relative group", getColor(b.intensity))}
                    >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 pointer-events-none">
                            <div className="bg-black text-gray-200 text-[10px] py-1 px-2 rounded whitespace-nowrap border border-gray-700 shadow-xl font-mono">
                                <span className="text-white font-bold">{b.count}</span> events on {b.date}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
