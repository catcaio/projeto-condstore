'use client';
import React, { useState } from 'react';
import { GovernanceShell } from './governance-shell';
import { ProjectHeader } from './project-header';
import { TaskBoard } from './task-board';
import { TaskList } from './task-list';

export function ProjectClientView({ spaceSlug, projectSlug }: { spaceSlug: string, projectSlug: string }) {
    const [activeTab, setActiveTab] = useState('board');
    
    return (
        <GovernanceShell spaceSlug={spaceSlug} projectSlug={projectSlug}>
            <ProjectHeader 
                projectSlug={projectSlug} 
                activeTab={activeTab} 
                onTabChange={setActiveTab} 
            />
            
            {activeTab === 'board' && <TaskBoard projectSlug={projectSlug} />}
            {activeTab === 'list' && <TaskList projectSlug={projectSlug} />}
            {activeTab === 'overview' && (
                <div className="p-8 text-center text-neutral-content flex-1 flex items-center justify-center italic">
                    Overview dashboard coming soon.
                </div>
            )}
        </GovernanceShell>
    );
}
