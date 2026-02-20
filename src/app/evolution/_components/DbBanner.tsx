import React from 'react';

export function DbBanner({ error }: { error: string | null }) {
    if (!error) return null;
    return (
        <div className="bg-red-950/50 border-b border-red-900/50 px-4 py-2 flex items-center justify-center space-x-2">
            <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-xs font-medium text-red-200 uppercase tracking-wider">DB Offline</span>
            <span className="text-xs text-red-400/80">({error})</span>
        </div>
    );
}
