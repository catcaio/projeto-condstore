"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { track, useScrollTracker } from '../lib/analytics';

// -- COMPONENTES INTERNOS ----------------------------------------------------

/** Wrapper de seção seguindo a especificação mobile-first */
function Section({
    children,
    className = ''
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`px-md py-xl flex flex-col gap-lg ${className}`}>
            {children}
        </section>
    );
}

/** Ícone utilitário para os Bullets */
function CheckIcon() {
    return (
        <svg
            className="w-6 h-6 flex-shrink-0 text-brand-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
}

// -- BLOCOS DA LANDING -------------------------------------------------------

export default function LandingPage() {
    const router = useRouter();

    // -- Analytics Hooks
    useScrollTracker('landing');

    useEffect(() => {
        track('landing_view');
    }, []);

    return (
        <div className="min-h-screen bg-surface-base text-ink-body font-sans">
            {/* 1) HERO (acima da dobra) */}
            <Section className="pt-[16vh]">
                <div className="text-center space-y-md">
                    <h1 className="text-heading-hero font-extrabold tracking-tight text-ink-hero leading-tight">
                        Automatize o frete da sua loja em minutos.
                    </h1>
                    <p className="text-body-lg text-ink-muted leading-relaxed max-w-sm mx-auto">
                        Cotações inteligentes, múltiplas transportadoras e automação via WhatsApp.
                    </p>

                    <div className="pt-sm space-y-sm flex flex-col items-center">
                        <button
                            onClick={() => {
                                track('landing_click_hero_primary');
                                router.push('/pricing');
                            }}
                            className="w-full max-w-xs h-14 rounded-token-pill bg-brand-primary text-ink-hero font-bold text-body-lg transition-all duration-200 ease-spring active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary outline-none ring-offset-background"
                        >
                            Começar Agora
                        </button>
                        <button
                            onClick={() => {
                                track('landing_click_hero_secondary');
                                router.push('/pricing');
                            }}
                            className="w-full max-w-xs h-12 rounded-token-pill text-ink-muted font-medium text-body-sm transition-all duration-200 ease-spring active:scale-[0.98] outline-none"
                        >
                            Ver Planos
                        </button>
                    </div>
                </div>
            </Section>

            {/* 2) BLOCO DE PROVA */}
            <Section>
                <div className="bg-surface-card p-md rounded-token-lg border border-edge-subtle">
                    <ul className="space-y-md">
                        <li className="flex items-start gap-sm text-body-md text-ink-hero font-medium">
                            <CheckIcon />
                            Reduz erros operacionais
                        </li>
                        <li className="flex items-start gap-sm text-body-md text-ink-hero font-medium">
                            <CheckIcon />
                            Aumenta velocidade de atendimento
                        </li>
                        <li className="flex items-start gap-sm text-body-md text-ink-hero font-medium">
                            <CheckIcon />
                            Escala sem contratar mais pessoas
                        </li>
                    </ul>
                </div>
            </Section>

            {/* 3) BLOCO DE DEMONSTRAÇÃO SIMPLES */}
            <Section>
                <div className="text-center mb-md">
                    <h2 className="text-heading-sm font-bold text-ink-hero">Cockpit de Controle</h2>
                </div>
                <div className="relative overflow-hidden bg-surface-elevated rounded-token-lg border border-edge-subtle p-md text-center shadow-token-1">
                    {/* Mock de interface simples para tangibilizar o valor */}
                    <div className="grid grid-cols-2 gap-sm mb-sm">
                        <div className="bg-surface-base p-sm rounded-token-md border border-edge-subtle">
                            <p className="text-body-sm text-ink-muted mb-1">Cotações / Mês</p>
                            <p className="text-heading-sm font-extrabold text-brand-primary">2.314</p>
                        </div>
                        <div className="bg-surface-base p-sm rounded-token-md border border-edge-subtle">
                            <p className="text-body-sm text-ink-muted mb-1">Rastreamento</p>
                            <p className="text-heading-sm font-extrabold text-success-base">98%</p>
                        </div>
                    </div>
                    <div className="bg-surface-base w-full h-2 rounded-token-pill overflow-hidden">
                        <div className="bg-brand-primary h-full w-[85%] rounded-token-pill" />
                    </div>
                    <p className="text-body-sm text-ink-muted mt-2">Visão em Tempo Real</p>
                </div>
            </Section>

            {/* 4/5) BLOCO DE SEGURANÇA & CTA FINAL */}
            <Section className="bg-surface-elevated rounded-t-[32px] border-t border-edge-subtle mt-xl pb-24">
                <div className="text-center space-y-lg">
                    <div className="space-y-2xs">
                        <h2 className="text-heading-sm font-bold text-ink-hero">
                            Pronto para crescer?
                        </h2>
                        <p className="text-body-sm text-ink-muted">
                            Infraestrutura segura, criptografia e uptime 99.9%.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            track('landing_click_final_cta');
                            router.push('/pricing');
                        }}
                        className="w-full max-w-sm mx-auto h-14 rounded-token-pill bg-brand-premium text-ink-hero font-bold text-body-lg transition-all duration-200 ease-spring active:scale-[0.98] shadow-token-glow outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-premium ring-offset-background"
                    >
                        Quero Automatizar Meu Frete
                    </button>
                </div>
            </Section>
        </div>
    );
}
