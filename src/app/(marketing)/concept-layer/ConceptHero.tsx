// EXPERIMENTAL CONCEPT LAYER — não remover sem validação estratégica
import React from 'react';
import { FractalBackground } from './FractalBackground';
import { ConceptSection } from './ConceptSection';
import { Button } from '@/ui/components/button';
import { TrackedLink } from '@/ui/lib/track-client';

export function ConceptHero() {
    return (
        <ConceptSection>
            <FractalBackground />
            <div
                className="mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-36 relative z-10 flex flex-col items-center text-center gap-10"
                data-cs="concept-hero"
            >
                <div className="inline-flex items-center rounded-full border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface)/0.5)] px-3 py-1 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-[hsl(var(--ui-surface))]">
                    <span className="flex h-2 w-2 rounded-full bg-[hsl(var(--ui-accent-blue))] mr-2"></span>
                    Sistema Operacional para E-commerce
                </div>

                <div className="max-w-4xl space-y-6">
                    <h1 className="text-[var(--text-hero)] font-bold text-[hsl(var(--ui-text))] leading-tight tracking-tight">
                        Recupere carrinhos pelo WhatsApp e saiba exatamente{' '}
                        <span className="text-[hsl(var(--ui-accent-blue))]">de onde veio cada venda.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-[hsl(var(--ui-text-muted))] max-w-2xl mx-auto leading-relaxed">
                        Um sistema operacional para e-commerce que vende, rastreia e organiza sua operação.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <TrackedLink href="/pricing" passHref trackPage="concept_landing" trackSection="hero" trackElement="hero_primary" legacyBehavior>
                        <Button variant="primary" size="lg" className="w-full sm:w-auto min-w-[200px]" data-cs-cta="concept-primary">
                            Começar agora
                        </Button>
                    </TrackedLink>
                    <TrackedLink href="#como-funciona" passHref trackPage="concept_landing" trackSection="hero" trackElement="hero_demo" legacyBehavior>
                        <Button variant="secondary" size="lg" className="w-full sm:w-auto min-w-[200px] bg-[hsl(var(--ui-surface)/0.8)] backdrop-blur-sm">
                            Ver demo
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </ConceptSection>
    );
}

export default ConceptHero;
