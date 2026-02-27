import React, { useMemo } from 'react';
import { ProjectReport } from '../types';
import { getDateDaysAgo } from '../utils';

interface TrendChartProps {
    reports: ProjectReport[];
    days: number;
}

export function TrendChart({ reports, days }: TrendChartProps) {
    const { points, maxVal } = useMemo(() => {
        const counts = new Map<string, number>();
        let max = 0;
        reports.forEach(r => {
            const d = new Date(r.created_at);
            d.setHours(0, 0, 0, 0);
            const k = d.getTime().toString();
            counts.set(k, (counts.get(k) || 0) + 1);
        });

        const pts = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = getDateDaysAgo(i);
            const ts = d.getTime().toString();
            const c = counts.get(ts) || 0;
            if (c > max) max = c;
            pts.push({ val: c, date: d.toLocaleDateString('pt-BR').substring(0, 5) });
        }
        return { points: pts, maxVal: max };
    }, [reports, days]);

    // Internal SVG Dimensions
    const width = 800;
    const height = 160;
    const paddingX = 20;
    const paddingY = 20;

    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;
    const safeMax = maxVal === 0 ? 1 : maxVal;

    const getX = (idx: number) => paddingX + (idx / Math.max(1, points.length - 1)) * innerW;
    const getY = (val: number) => height - paddingY - (val / safeMax) * innerH;

    const pathD = points.length > 0
        ? `M ${getX(0)},${getY(points[0].val)} ` + points.slice(1).map((p, i) => `L ${getX(i + 1)},${getY(p.val)}`).join(' ')
        : '';

    const areaD = points.length > 0
        ? `${pathD} L ${getX(points.length - 1)},${height - paddingY} L ${getX(0)},${height - paddingY} Z`
        : '';

    return (
        <div className="w-full h-full relative group flex flex-col">
            <div className="flex justify-between items-center mb-2 px-2">
                <h3 className="text-[10px] uppercase text-[var(--text-secondary)] tracking-wider font-semibold">Event Trend</h3>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono">Peak: {maxVal}/d</span>
            </div>

            <div className="flex-1 relative">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
                    {/* Horizontal Guides */}
                    <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#222" strokeDasharray="4 4" strokeWidth="1" />
                    <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="#222" strokeDasharray="4 4" strokeWidth="1" />
                    <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#333" strokeWidth="1" />

                    {maxVal > 0 && (
                        <>
                            <path d={areaD} fill="url(#blueGrad)" opacity={0.15} />
                            <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
                        </>
                    )}

                    <defs>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="1" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Crosshair / Overlay conceptually (pure CSS on hover over specific divisions but keeping simple for now) */}
            </div>

            <div className="flex justify-between px-2 text-[9px] text-[var(--text-secondary)] font-mono mt-1">
                <span>{points[0]?.date}</span>
                <span>{points[Math.floor(points.length / 2)]?.date}</span>
                <span>{points[points.length - 1]?.date}</span>
            </div>
        </div>
    );
}
