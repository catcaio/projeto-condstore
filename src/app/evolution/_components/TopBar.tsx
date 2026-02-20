import React from 'react';
import { FilterState, TimeRange } from '../types';

interface TopBarProps {
    state: FilterState;
    updateState: (updates: Partial<FilterState>) => void;
    buildInfo: { version: string; env: string; serverTime: string };
    dbError: string | null;
}

export function TopBar({ state, updateState, buildInfo, dbError }: TopBarProps) {
    return (
        <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-4">
                <h1 className="text-base font-bold text-gray-100 flex items-center space-x-2">
                    <span className="w-4 h-4 rounded-sm bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"></span>
                    <span>Condstore OS Evolution</span>
                </h1>

                <div className="hidden sm:flex items-center space-x-2 text-[10px] font-mono uppercase tracking-wider">
                    <span className="px-1.5 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">
                        {buildInfo.env}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-900 text-gray-400 border border-gray-800">
                        v{buildInfo.version}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border ${dbError ? 'bg-red-950/50 text-red-400 border-red-900/50' : 'bg-emerald-950/50 text-emerald-400 border-emerald-900/50'}`}>
                        DB: {dbError ? 'ERR' : 'OK'}
                    </span>
                </div>
            </div>

            <div className="flex items-center space-x-3">
                <div className="relative">
                    <input
                        type="search"
                        placeholder="Search logs/modules..."
                        className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded px-3 py-1.5 w-48 sm:w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-600 transition-all font-mono"
                        value={state.q}
                        onChange={(e) => updateState({ q: e.target.value })}
                    />
                </div>

                <select
                    className="bg-gray-900 border border-gray-800 text-gray-200 text-xs font-mono rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                    value={state.range}
                    onChange={(e) => updateState({ range: e.target.value as TimeRange })}
                >
                    <option value="7d">Last 7d</option>
                    <option value="14d">Last 14d</option>
                    <option value="30d">Last 30d</option>
                    <option value="90d">Last 90d</option>
                </select>

                <button
                    onClick={() => updateState({ autoRefresh: !state.autoRefresh })}
                    className={`text-xs px-2 py-1.5 rounded border transition-colors flex items-center space-x-1.5 cursor-pointer font-mono ${state.autoRefresh ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' : 'bg-gray-900 text-gray-500 border-gray-800'}`}
                >
                    <span>Auto</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${state.autoRefresh ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]' : 'bg-gray-600'}`}></div>
                </button>

                <a href="https://github.com/catcaio/projeto-condstore" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors p-1">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"></path></svg>
                </a>
            </div>
        </header>
    );
}
