'use client';

import React from 'react';

export function ProjectHeader({ projectSlug, activeTab, onTabChange }: { projectSlug: string, activeTab: string, onTabChange: (tab: string) => void }) {
    return (
        <div className="border-b border-neutral-border dark:border-neutral-border bg-base-surface dark:bg-base-surface px-6 py-4 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                    {projectSlug.toUpperCase().replace('-', ' ')}
                </h1>
                <div className="flex items-center space-x-2">
                    <button className="px-3 py-1.5 bg-brand-primary hover:bg-brand-primary text-white text-sm font-medium rounded-md shadow-sm transition-all focus:ring-2 focus:ring-brand-primary focus:ring-offset-1">
                        + New Task
                    </button>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex items-center space-x-6 text-sm">
                {['overview', 'board', 'list'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`pb-2 border-b-2 font-medium capitalize transition-colors ${activeTab === tab ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-neutral-content hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>
    );
}
