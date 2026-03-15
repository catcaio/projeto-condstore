import React from 'react';
import { TaskDetailDrawer } from '@/modules/governance/components/task-detail-drawer';
import Link from 'next/link';

export default async function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
    const { taskId } = await params;
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0a0f1c]">
            <div className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center shadow-sm">
                <Link href="/cockpit/governance" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center transition-colors">
                    &larr; Back to Governance Workspace
                </Link>
            </div>
            <TaskDetailDrawer taskId={taskId} />
        </div>
    );
}
