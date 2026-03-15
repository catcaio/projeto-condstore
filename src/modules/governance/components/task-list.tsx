'use client';

import React from 'react';

export function TaskList({ projectSlug }: { projectSlug: string }) {
    return (
        <div className="p-6">
            <div className="bg-base-surface dark:bg-base-surface rounded-lg shadow-sm border border-neutral-border dark:border-neutral-border overflow-hidden">
                <table className="min-w-full divide-y divide-neutral-border dark:divide-neutral-border">
                    <thead className="bg-neutral-subtle dark:bg-neutral-subtle">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-content uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-content uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-content uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-content uppercase tracking-wider">Assignee</th>
                        </tr>
                    </thead>
                    <tbody className="bg-base-surface dark:bg-base-surface divide-y divide-neutral-border dark:divide-neutral-border text-sm">
                        <tr className="hover:bg-neutral-subtle dark:hover:bg-neutral-subtle/50 cursor-pointer transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-neutral-content font-medium">TSK-101</td>
                            <td className="px-6 py-4 whitespace-nowrap text-neutral-dark dark:text-neutral-light font-semibold">Setup Governance DB</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs font-semibold rounded-md bg-brand-primary/10 text-brand-primary dark:bg-brand-primary/20 dark:text-brand-primary">
                                    In Progress
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-neutral-content">System</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
