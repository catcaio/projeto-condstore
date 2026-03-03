import React, { useState } from 'react';
import { ProjectReport } from '../types';
import { parseTags, formatTimeRelative } from '../utils';

export function ReportEventRow({ report, onTagClick }: { report: ProjectReport, onTagClick: (t: string) => void }) {
    const [expanded, setExpanded] = useState(false);

    const tags = parseTags(report.tags);
    const d = new Date(report.created_at);

    const getStatusColor = (s: string) => {
        if (s === 'done') return 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30';
        if (s === 'warn') return 'text-amber-400 border-amber-900/50 bg-amber-950/30';
        if (s === 'in_progress') return 'text-blue-400 border-blue-900/50 bg-blue-950/30';
        return 'text-[var(--text-secondary)] border-[var(--border-default)] bg-[var(--bg-panel)]';
    };

    return (
        <div className="border-bottom border-[var(--border-default)] hover:bg-[#151518] transition-colors group">
            <div
                className="flex items-center px-4 py-2 cursor-pointer border-b border-[var(--border-default)] border-dashed"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="text-[10px] text-[var(--text-secondary)] font-mono w-16 shrink-0 pt-0.5">
                    {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>

                <div className="flex items-center space-x-2 w-48 shrink-0">
                    <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border ${getStatusColor(report.status)}`}>
                        {report.status}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] border border-[var(--border-default)] bg-[var(--bg-panel)] px-1.5 py-0.5 rounded truncate max-w-[100px]" title={report.module_key}>
                        {report.module_key}
                    </span>
                </div>

                <div className="flex-1 min-w-0 pr-4 flex items-center">
                    <span className="text-xs text-[var(--text-secondary)] group-hover:text-blue-300 transition-colors truncate block flex-1">
                        {report.title}
                    </span>
                    {expanded ? (
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono ml-2 shrink-0">- collapse</span>
                    ) : (
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">+ expand</span>
                    )}
                </div>

                <div className="hidden md:flex items-center space-x-1 shrink-0 mr-4">
                    {tags.slice(0, 3).map(t => (
                        <span
                            key={t}
                            onClick={(e) => { e.stopPropagation(); onTagClick(t); }}
                            className="text-[9px] text-[var(--text-secondary)] hover:text-blue-400 font-mono hover:bg-blue-900/30 px-1 rounded transition-colors"
                        >
                            #{t}
                        </span>
                    ))}
                    {tags.length > 3 && <span className="text-[9px] text-[var(--text-secondary)]">+{tags.length - 3}</span>}
                </div>

                <span className="text-[10px] text-[var(--text-secondary)] font-mono w-16 text-right shrink-0">
                    {formatTimeRelative(d)}
                </span>
            </div>

            {expanded && (
                <div className="px-4 pb-4 pt-3 ml-16 border-l-2 border-[var(--border-default)] mr-4 mb-2 mt-2 bg-[#0a0a0c] rounded border border-[var(--border-default)] relative">
                    <div className="absolute top-0 -left-[2px] w-[2px] h-full bg-blue-500/50 rounded-l"></div>
                    <div className="space-y-4">
                        <div>
                            <h5 className="text-[10px] uppercase text-[var(--text-secondary)] tracking-wider font-semibold mb-1">Summary</h5>
                            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-sans">{report.summary}</p>
                        </div>

                        {(report.changes || report.metrics) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {report.changes && (
                                    <div>
                                        <h5 className="text-[10px] uppercase text-[var(--text-secondary)] tracking-wider font-semibold mb-1">Changes</h5>
                                        <div className="text-[11px] text-[var(--text-secondary)] font-mono bg-[#111] p-2 rounded border border-[var(--border-default)] whitespace-pre-wrap max-h-48 overflow-auto">
                                            {report.changes}
                                        </div>
                                    </div>
                                )}
                                {report.metrics && (
                                    <div>
                                        <h5 className="text-[10px] uppercase text-[var(--text-secondary)] tracking-wider font-semibold mb-1">Metrics</h5>
                                        <div className="text-[11px] text-emerald-400/80 font-mono bg-[#111] p-2 rounded border border-emerald-900/30 whitespace-pre-wrap">
                                            {report.metrics}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {(report.risks || report.next_actions) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {report.risks && (
                                    <div>
                                        <h5 className="text-[10px] uppercase text-red-500/80 tracking-wider font-semibold mb-1">Risks / Warnings</h5>
                                        <div className="text-[11px] text-red-300/80 font-mono bg-red-950/20 p-2 rounded border border-red-900/30 whitespace-pre-wrap">
                                            {report.risks}
                                        </div>
                                    </div>
                                )}
                                {report.next_actions && (
                                    <div>
                                        <h5 className="text-[10px] uppercase text-blue-500/80 tracking-wider font-semibold mb-1">Next Actions</h5>
                                        <div className="text-[11px] text-blue-300/80 font-mono bg-blue-950/20 p-2 rounded border border-blue-900/30 whitespace-pre-wrap mt-1">
                                            {report.next_actions}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-default)]">
                            <div className="flex flex-wrap gap-1">
                                {tags.map(t => (
                                    <span key={t} onClick={() => onTagClick(t)} className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--border-default)] bg-[var(--bg-panel)] text-[var(--text-secondary)] font-mono cursor-pointer hover:bg-[var(--bg-panel)] hover:text-white transition-colors">#{t}</span>
                                ))}
                            </div>
                            <span className="text-[9px] text-[var(--text-secondary)] font-mono">ID: {report.id}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
