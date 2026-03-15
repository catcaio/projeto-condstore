'use client';

import React from 'react';

export function CommentThread({ taskId }: { taskId: string }) {
    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-slate-800 dark:text-neutral-light">Activity & Comments</h3>
            
            <div className="p-4 rounded-lg bg-neutral-subtle dark:bg-neutral-subtle/50 border border-slate-100 dark:border-neutral-border text-sm">
                <div className="flex font-semibold mb-1">
                    <span className="text-indigo-600 dark:text-indigo-400 mr-2">System</span>
                    <span className="text-neutral-content font-normal">Created this task via Automation</span>
                </div>
            </div>

            <div className="mt-4 flex gap-3">
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                <input 
                    type="text" 
                    placeholder="Write an update..." 
                    className="flex-1 px-4 py-2 border border-neutral-border dark:border-neutral-border rounded-lg bg-base-surface dark:bg-base-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50" 
                />
            </div>
        </div>
    );
}

export function LinkedEntitiesPanel({ taskId }: { taskId: string }) {
    return (
        <div className="bg-base-surface dark:bg-neutral-subtle rounded-lg p-4 border border-neutral-border dark:border-neutral-border shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-content mb-3">Linked Entities</h3>
            <div className="text-sm text-neutral-content italic mb-2">No ecosystem entities linked yet.</div>
            <button className="text-indigo-600 dark:text-indigo-400 mt-2 text-sm font-medium hover:underline flex items-center">
                + Link Entity
            </button>
        </div>
    );
}

export function TaskDetailDrawer({ taskId }: { taskId: string }) {
    return (
        <div className="p-8 bg-base-surface dark:bg-[#0f1322] rounded-2xl shadow-xl border border-neutral-border dark:border-neutral-border max-w-5xl mx-auto my-8 min-h-[600px]">
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-neutral-border pb-6">
                <div>
                    <span className="text-indigo-500 font-bold tracking-wide text-xs mb-2 block uppercase">{taskId}</span>
                    <h1 className="text-3xl font-bold text-neutral-dark dark:text-slate-50">Task Details Example</h1>
                </div>
                <button className="px-4 py-2 bg-slate-100 dark:bg-neutral-subtle text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                    Status: Open
                </button>
            </div>
            
            <div className="grid grid-cols-3 gap-10">
                <div className="col-span-2 space-y-8">
                    <div>
                        <h3 className="text-xs font-semibold text-neutral-content uppercase tracking-wider mb-3">Description</h3>
                        <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                            <p>Here goes the detailed description of the task...</p>
                            <p className="mt-2 text-sm text-neutral-content">It can support rich text eventually depending on the future implementation.</p>
                        </div>
                    </div>
                    <hr className="border-slate-100 dark:border-neutral-border" />
                    <CommentThread taskId={taskId} />
                </div>
                
                <div className="col-span-1 space-y-6">
                    <div className="bg-neutral-subtle dark:bg-base-surface p-5 rounded-xl border border-slate-100 dark:border-neutral-border space-y-4 shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-neutral-content font-bold uppercase tracking-wider">Assignee</span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1 flex items-center">
                                <div className="w-5 h-5 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 mr-2 shadow-sm"></div> 
                                Unassigned
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-neutral-content font-bold uppercase tracking-wider">Due Date</span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1">
                                Tomorrow
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] text-neutral-content font-bold uppercase tracking-wider">Priority</span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-1 flex items-center">
                                <span className="w-2 h-2 rounded-full bg-brand-primary mr-2"></span> High
                            </span>
                        </div>
                    </div>
                    
                    <LinkedEntitiesPanel taskId={taskId} />
                </div>
            </div>
        </div>
    );
}
