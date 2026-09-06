'use client';

import React, { useState } from 'react';
import { CommandPalette } from '@/ui/foundation';
import type { CockpitDataBundle, WorkItemCategory } from '../data/shared';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { AttentionStrip } from './components/AttentionStrip';
import { WorkspaceFilters } from './components/WorkspaceFilters';
import { WorkQueue } from './components/WorkQueue';
import { ContextPanel } from './components/ContextPanel';
import { MobileContextSheet } from './components/MobileContextSheet';
import { WorkspaceAlertBanner, WorkspaceFallbackBanner } from './components/WorkspaceStates';

export interface CockpitWorkspaceShellProps {
    data: CockpitDataBundle;
    onRefresh?: () => void;
    isLoading?: boolean;
}

export function CockpitWorkspaceShell({ data, onRefresh, isLoading }: CockpitWorkspaceShellProps) {
    const [selectedCategory, setSelectedCategory] = useState<WorkItemCategory | 'all'>('all');
    const [activeItemId, setActiveItemId] = useState<string | null>(null);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

    const metrics = data.derived?.metricsSnapshot ?? {
        activeConversationCount: 0,
        unansweredConversationCount: 0,
        processingOrderCount: 0,
        pendingOrdersCount: 0,
        simulationsToday: 0,
        pendingFreightCount: 0,
        errorsAndExceptions: 0,
        activeIncidentCount: 0,
        failedDomineEventsCount: 0,
        failedWebhookEventsCount: 0,
        criticalSystemCount: 0,
    };
    const queueItems = data.queue ?? [];
    const alerts = data.alerts ?? [];
    const isRealData = data.meta.source === 'real';

    // Contract-based typed filtering
    const filteredQueue = queueItems.filter((item) => {
        if (selectedCategory === 'all') return true;
        return item.category === selectedCategory;
    });

    const activeItem = activeItemId ? queueItems.find((i) => i.id === activeItemId) ?? null : null;

    const handleSelectItem = (id: string) => {
        setActiveItemId(id);
        setIsMobileDrawerOpen(true);
    };

    const handleExecuteAction = async (action: import('../data/shared').WorkItemAction, item: import('../data/shared').CockpitActionQueueItem) => {
        if (!action.endpoint) return;

        const methodMap: Record<import('../data/shared').WorkItemAction['type'], string> = {
            api_put: 'PUT',
            api_post: 'POST',
            api_patch: 'PATCH',
            link: 'GET',
        };

        const method = methodMap[action.type];
        if (!method || method === 'GET') return;

        const response = await fetch(action.endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: action.payload ? JSON.stringify(action.payload) : undefined,
        });

        if (!response.ok) {
            const errorJson = await response.json().catch(() => ({}));
            throw new Error(errorJson.message || `Ação recusada pelo servidor (${response.status})`);
        }

        if (onRefresh) {
            onRefresh();
        }
    };

    return (
        <div className="min-h-screen bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] flex flex-col font-sans w-full overflow-x-hidden">
            <CommandPalette />

            <WorkspaceHeader
                isRealData={isRealData}
                onRefresh={onRefresh}
                isLoading={isLoading}
            />

            <WorkspaceFallbackBanner
                isRealData={isRealData}
                fallbackReason={data.meta.fallbackReason}
                partialBlocks={data.meta.partialBlocks}
            />

            <AttentionStrip
                metrics={metrics}
                onSelectCategoryFilter={(cat) => setSelectedCategory(cat)}
            />

            <main className="flex-1 mx-auto max-w-7xl w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <section className="lg:col-span-8 space-y-4 w-full">
                    <WorkspaceFilters
                        selectedCategory={selectedCategory}
                        onSelectCategory={(cat) => setSelectedCategory(cat)}
                        totalCount={queueItems.length}
                    />

                    <WorkspaceAlertBanner alerts={alerts} />

                    <WorkQueue
                        items={filteredQueue}
                        activeItemId={activeItemId}
                        onSelectItem={handleSelectItem}
                    />
                </section>

                <div className="hidden lg:block lg:col-span-4 w-full">
                    <ContextPanel activeItem={activeItem} onExecuteAction={handleExecuteAction} />
                </div>
            </main>

            <MobileContextSheet
                isOpen={isMobileDrawerOpen}
                activeItem={activeItem}
                onClose={() => setIsMobileDrawerOpen(false)}
                onExecuteAction={handleExecuteAction}
            />
        </div>
    );
}
