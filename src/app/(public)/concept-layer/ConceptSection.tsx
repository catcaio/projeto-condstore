// EXPERIMENTAL CONCEPT LAYER — não remover sem validação estratégica
import React from 'react';

interface ConceptSectionProps {
    children: React.ReactNode;
}

export function ConceptSection({ children }: ConceptSectionProps) {
    return (
        <section className="relative w-full overflow-hidden border-b border-[hsl(var(--ui-border)/0.5)]">
            {children}
        </section>
    );
}
