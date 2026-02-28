import React, { Suspense } from 'react';
import { caseProofData } from '@/config/case-proof';
import { TrackedLink, SectionTracker } from '@/ui/lib/track-client';
import { Button } from '@/ui/components/button';
import Link from 'next/link';

export function CaseProofSection() {
    if (process.env.CASE_PROOF_ENABLED === 'false') {
        return null; // Feature flaged for turning off via ENV
    }

    return (
        <section className="w-full max-w-[var(--container-max-width)] mx-auto px-6 lg:px-8 mb-16 relative">
            <SectionTracker page="landing" section="case_proof" />
            <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-8 md:p-12 shadow-[var(--shadow-soft)] hover:shadow-lg transition-shadow relative overflow-hidden">
                <h2 className="text-3xl font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">
                    Resultados reais em operação
                </h2>
                <p className="text-[hsl(var(--ui-text-muted))] mb-12 font-medium">
                    {caseProofData.tenantName} — automação de frete + WhatsApp
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
                    {caseProofData.kpis.map((kpi, idx) => (
                        <div key={idx} className="bg-[hsl(var(--ui-surface-elevated))] border border-[hsl(var(--ui-border)/0.5)] rounded-[var(--radius-card)] p-6 flex flex-col items-center justify-center shadow-sm">
                            <span className="text-4xl font-extrabold text-[hsl(var(--ui-accent-blue))] mb-2 tracking-tight">{kpi.value}</span>
                            <span className="text-xs font-semibold text-[hsl(var(--ui-text-subtle))] uppercase tracking-wider">{kpi.label}</span>
                        </div>
                    ))}
                </div>

                <div className="max-w-3xl text-center mb-8 px-4 md:px-12 border-l-4 border-[hsl(var(--ui-accent-blue))]">
                    <p className="text-[hsl(var(--ui-text))] text-lg md:text-xl font-medium leading-relaxed italic text-left">
                        "{caseProofData.note}"
                    </p>
                </div>

                <div className="mt-4 flex justify-end w-full">
                    <TrackedLink href="#como-funciona" passHref trackPage="landing" trackSection="case_proof" trackElement="caseproof_demo">
                        <Button variant="ghost" className="font-semibold text-[hsl(var(--ui-accent-blue))] hover:text-[hsl(var(--ui-accent-blue-strong))] hover:bg-[hsl(var(--ui-accent-blue)/0.1)]">
                            Ver como funciona &rarr;
                        </Button>
                    </TrackedLink>
                </div>
            </div>
        </section>
    );
}
