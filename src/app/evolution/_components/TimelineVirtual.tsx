import React, { useState, useMemo } from 'react';
import { ProjectReport } from '../types';
import { ReportEventRow } from './ReportEventRow';

interface TimelineVirtualProps {
    reports: ProjectReport[];
    onTagClick: (tag: string) => void;
}

export function TimelineVirtual({ reports, onTagClick }: TimelineVirtualProps) {
    const [limit, setLimit] = useState(50);
    
    // Group chronologically by day to provide "checkpoints" in the stream
    const groups = useMemo(() => {
        const visible = reports.slice(0, limit);
        const map = new Map<string, ProjectReport[]>();
        
        visible.forEach(r => {
            const date = new Date(r.created_at).toLocaleDateString('pt-BR');
            if (!map.has(date)) map.set(date, []);
            map.get(date)!.push(r);
        });
        
        return Array.from(map.entries());
    }, [reports, limit]);

    if (reports.length === 0) return null;

    return (
        <div className="flex flex-col h-full bg-[#0e0e11] rounded border border-gray-800 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#111]">
                <h3 className="text-[10px] uppercase text-gray-500 tracking-wider font-semibold">Event Log Stream</h3>
                <span className="text-[10px] text-gray-400 font-mono tracking-tight bg-gray-900 px-2 py-0.5 rounded border border-gray-800">{reports.length} matching events</span>
            </div>
            
            {/* Height constraint + scroll to enable progressive pseudo-virtualization */}
            <div className="flex-1 overflow-y-auto max-h-[800px] bg-[#0c0c0e]">
                {groups.map(([date, items]) => (
                    <div key={date}>
                        {/* Day Divider */}
                        <div className="sticky top-0 z-10 bg-[#0c0c0e]/95 backdrop-blur border-y border-gray-800/80 px-4 py-1.5 flex items-center shadow-lg">
                            <span className="text-[9px] font-bold text-gray-400 font-mono tracking-widest uppercase">{date}</span>
                        </div>
                        
                        <div className="flex flex-col bg-[#0e0e11]">
                            {items.map(r => (
                                <ReportEventRow key={r.id} report={r} onTagClick={onTagClick} />
                            ))}
                        </div>
                    </div>
                ))}
                
                {reports.length > limit && (
                    <div className="p-4 flex justify-center border-t border-gray-800 bg-[#111]">
                        <button 
                            onClick={() => setLimit(prev => prev + 50)}
                            className="bg-gray-900 border border-gray-700 hover:border-blue-500/50 hover:text-blue-400 hover:bg-gray-800 text-gray-300 text-[11px] px-6 py-2.5 rounded transition-all font-mono font-semibold tracking-wider uppercase shadow-sm"
                        >
                            Load 50 Older Logs (of {reports.length - limit} remaining)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
