'use client';

import React from 'react';
import { SpaceSwitcher } from './space-switcher';
import { ProjectSidebar } from './project-sidebar';

export function GovernanceShell({ 
    children, 
    spaceSlug, 
    projectSlug 
}: { 
    children: React.ReactNode; 
    spaceSlug?: string; 
    projectSlug?: string; 
}) {
    return (
        <div className="flex h-[calc(100vh-64px)] w-full bg-neutral-subtle dark:bg-neutral-subtle text-neutral-dark dark:text-neutral-light overflow-hidden">
            {/* Sidebar area */}
            <aside className="w-64 flex-shrink-0 border-r border-neutral-border dark:border-neutral-border flex flex-col bg-base-surface dark:bg-base-surface">
                <div className="p-4 border-b border-neutral-border dark:border-neutral-border">
                    <SpaceSwitcher currentSpaceSlug={spaceSlug} />
                </div>
                <div className="flex-1 overflow-y-auto">
                    {spaceSlug && <ProjectSidebar spaceSlug={spaceSlug} activeProjectSlug={projectSlug} />}
                </div>
            </aside>
            
            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-neutral-subtle dark:bg-[#0a0f1c] overflow-hidden">
                {children}
            </main>
        </div>
    );
}
