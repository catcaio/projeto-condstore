import React from 'react';

export function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] border border-gray-800 border-dashed rounded-lg bg-[#0e0e11] mt-8">
            <svg className="w-12 h-12 text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-gray-300 font-medium mb-1 text-sm tracking-wide">No Observability Data Found</h3>
            <p className="text-xs text-gray-500 text-center max-w-sm mb-6">
                The database connection is active, but no event logs match the current filters or time range.
            </p>
            <div className="bg-[#111] border border-gray-800 p-4 rounded text-left max-w-lg w-full shadow-lg">
                <p className="text-[10px] font-mono text-gray-500 mb-2 uppercase tracking-wider font-semibold">To seed mock data via CLI:</p>
                <code className="text-[10px] text-blue-400 block bg-[#0a0a0c] p-3 rounded border border-gray-800 font-mono shadow-inner break-all">
                    curl -X POST "https://projeto-condstore.vercel.app/api/reports/seed?token=\$SEED_TOKEN"
                </code>
            </div>
        </div>
    );
}
