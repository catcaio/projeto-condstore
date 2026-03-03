// PREVIEW — CONCEPT LAYER
import React from 'react';
import ConceptHero from '../concept-layer/ConceptHero';

export const metadata = {
    title: 'Preview | Concept Layer',
};

export default function ConceptLayerPreviewPage() {
    return (
        <div className="min-h-screen bg-[hsl(var(--ui-background))] text-[hsl(var(--ui-text))] flex flex-col relative w-full overflow-hidden">
            <div className="w-full bg-[hsl(var(--ui-accent-purple)/0.1)] text-[hsl(var(--ui-accent-purple))] text-center py-2 text-xs font-bold tracking-widest uppercase border-b border-[hsl(var(--ui-accent-purple)/0.2)]">
                PREVIEW — CONCEPT LAYER
            </div>
            <main className="flex-1 flex flex-col">
                <ConceptHero />
            </main>
        </div>
    );
}
