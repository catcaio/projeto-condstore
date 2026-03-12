import React from 'react';
import PipelineClient from './pipeline.client';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pipeline CRM | Condstore OS',
};

export default function PipelinePage() {
    return (
        <React.Fragment>
            <div className="flex h-full flex-col">
                <header className="border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-6 py-4">
                    <h1 className="text-xl font-semibold">CRM Pipeline</h1>
                    <p className="text-sm text-[hsl(var(--ui-text-muted))]">Organize suas conversas e converta mais atendimentos em vendas.</p>
                </header>
                <main className="flex-1 overflow-hidden bg-[hsl(var(--ui-bg-subtle))] p-6">
                    <PipelineClient />
                </main>
            </div>
        </React.Fragment>
    );
}
