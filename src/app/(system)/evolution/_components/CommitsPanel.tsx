import React from 'react';
import { GitHubCommit } from '../types';
import { formatTimeRelative } from '../utils';

export function CommitsPanel({ commits }: { commits: GitHubCommit[] }) {
    if (commits.length === 0) {
        return (
            <div className="flex flex-col h-full">
                <h3 className="text-[10px] uppercase text-[var(--text-secondary)] tracking-wider font-semibold mb-3">Live Deployments (Commits)</h3>
                <div className="flex-1 flex items-center justify-center text-xs text-[var(--text-secondary)]">No commits found or API limit reached.</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-[10px] uppercase text-[var(--text-secondary)] tracking-wider font-semibold mb-3 flex items-center justify-between">
                <span>Deploy Streams</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></span>
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {commits.map(c => {
                    const msgLines = c.commit.message.split('\n');
                    const title = msgLines[0];
                    const body = msgLines.slice(1).join('\n').trim();
                    const d = new Date(c.commit.author.date);

                    return (
                        <div key={c.sha} className="group flex flex-col space-y-1.5 pb-4 border-b border-[var(--border-default)] border-dashed last:border-0 last:pb-0">
                            <div className="flex items-center justify-between">
                                <a
                                    href={c.html_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-blue-400 transition-colors truncate pr-2 flex-1"
                                    title={c.commit.message}
                                >
                                    {title}
                                </a>
                                <span className="text-[9px] font-mono text-[var(--text-secondary)] shrink-0 bg-[#0a0a0c] px-1.5 py-0.5 rounded border border-[var(--border-default)] group-hover:border-blue-900/50 group-hover:text-blue-300 transition-colors cursor-pointer">
                                    {c.sha.substring(0, 7)}
                                </span>
                            </div>

                            {body && <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed bg-[#111] p-1.5 rounded">{body}</p>}

                            <div className="flex items-center space-x-2 text-[9px] font-mono text-[var(--text-secondary)] pt-0.5">
                                <span className="flex items-center">
                                    <svg className="w-2.5 h-2.5 mr-1 text-[var(--text-secondary)]" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M10.5 5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm.061 3.073a4 4 0 10-5.123 0 6.004 6.004 0 00-3.431 5.142.75.75 0 001.498.07 4.5 4.5 0 018.99 0 .75.75 0 101.498-.07 6.004 6.004 0 00-3.432-5.142z"></path></svg>
                                    <span className="text-[var(--text-secondary)]">{c.commit.author.name}</span>
                                </span>
                                <span>•</span>
                                <span>{formatTimeRelative(d)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <a href="https://github.com/catcaio/projeto-condstore/commits/main" target="_blank" rel="noreferrer" className="mt-4 block text-center text-[9px] uppercase tracking-widest text-[var(--text-secondary)] font-bold hover:text-white transition-colors p-2 bg-[#151518] hover:bg-[var(--bg-panel)] rounded border border-[var(--border-default)]">
                View GitHub History
            </a>
        </div>
    );
}
