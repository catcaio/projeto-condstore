"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// -- COMPONENTES INTERNOS ----------------------------------------------------

/** Wrapper de seção seguindo a especificação mobile-first */
function Section({ children }: { children: React.ReactNode }) {
    return (
        <section className="px-md py-xl flex flex-col gap-lg">
            {children}
        </section>
    );
}

/** Título e Descrição da página */
function HeroHeader() {
    return (
        <div className="text-center space-y-2xs">
            <h1 className="text-heading-hero font-extrabold tracking-tight text-ink-hero">
                Escolha seu Plano
            </h1>
            <p className="text-body-lg text-ink-muted leading-relaxed">
                Automatize sua operação de frete com inteligência e escala.
            </p>
        </div>
    );
}

/** Componente tátil para Cards */
function Pressable({
    children,
    onClick,
    className = '',
}: {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
}) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            className={`
        cursor-pointer
        transition-all duration-200 ease-spring
        active:scale-[0.98] outline-none
        ring-offset-background focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2
        ${className}
      `}
        >
            {children}
        </div>
    );
}

/** Pill de desconto */
function BadgeSaving({ text }: { text: string }) {
    return (
        <span className="inline-flex items-center rounded-token-pill bg-success-base/10 px-2.5 py-0.5 text-body-sm font-bold text-success-base border border-success-base/20">
            {text}
        </span>
    );
}

/** Card de Plano com isolamento Premium */
function PlanCard({
    title,
    price,
    features,
    isPremium,
    isSelected,
    onSelect,
}: {
    title: string;
    price: string;
    features: string[];
    isPremium: boolean;
    isSelected: boolean;
    onSelect: () => void;
}) {
    return (
        <Pressable
            onClick={onSelect}
            className={`
        relative p-md rounded-token-lg border-2 text-left
        ${isPremium ? 'shadow-token-glow bg-surface-elevated' : 'bg-surface-card'}
        ${isSelected
                    ? isPremium
                        ? 'border-brand-premium'
                        : 'border-brand-primary'
                    : 'border-edge-subtle'
                }
      `}
        >
            <div className="flex justify-between items-start mb-sm">
                <h3 className={`text-heading-sm font-bold ${isPremium ? 'text-brand-premium' : 'text-ink-hero'}`}>
                    {title}
                </h3>
                {isPremium && <BadgeSaving text="Recomendado" />}
            </div>

            <div className="mb-md">
                <span className="text-heading-hero font-extrabold text-ink-hero">{price}</span>
                <span className="text-body-sm text-ink-muted ml-1">/ mês</span>
            </div>

            <ul className="space-y-sm">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-xs text-body-md text-ink-body">
                        <svg
                            className={`w-5 h-5 flex-shrink-0 ${isPremium ? 'text-brand-premium' : 'text-brand-primary'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                    </li>
                ))}
            </ul>

            {/* Indicador de Seleção Visual (Radio imitador) */}
            <div className="absolute top-md right-md">
                <div className={`
           w-6 h-6 rounded-full border-2 flex items-center justify-center
           ${isSelected
                        ? isPremium
                            ? 'border-brand-premium bg-brand-premium'
                            : 'border-brand-primary bg-brand-primary'
                        : 'border-edge-subtle'
                    }
         `}>
                    {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-surface-base" />
                    )}
                </div>
            </div>
        </Pressable>
    );
}

/** Accordion Headless (HTML5 nativo + CSS grid trick para animação fina se desejado) */
function DetailsAccordion({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <details className="group border border-edge-subtle rounded-token-md bg-surface-card overflow-hidden">
            <summary className="flex items-center justify-between p-md cursor-pointer list-none text-body-lg font-bold text-ink-hero outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-brand-primary">
                {title}
                <span className="transition-transform duration-200 ease-smooth group-open:rotate-180">
                    <svg className="w-5 h-5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </summary>
            <div className="px-md pb-md text-body-md text-ink-body leading-relaxed">
                {children}
            </div>
        </details>
    );
}

/** CTA Fixo no Mobile (Safe-Area compliant) */
function StickyCTA({
    isPremiumSelected,
    onCheckout,
    loading,
}: {
    isPremiumSelected: boolean;
    onCheckout: () => void;
    loading: boolean;
}) {
    return (
        <div className="fixed bottom-0 left-0 w-full p-md pt-sm pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-surface-base/80 backdrop-blur-md border-t border-edge-subtle z-50">
            <button
                type="button"
                disabled={loading}
                onClick={onCheckout}
                className={`
          w-full h-14 rounded-token-pill font-bold text-body-lg text-ink-hero
          transition-all duration-200 ease-spring active:scale-[0.98]
          flex items-center justify-center gap-xs
          disabled:opacity-50 disabled:pointer-events-none
          ${isPremiumSelected ? 'bg-brand-premium' : 'bg-brand-primary'}
        `}
            >
                {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    'Assinar Agora'
                )}
            </button>
        </div>
    );
}

// -- PÁGINA PRINCIPAL --------------------------------------------------------

export default function PricingPage() {
    const router = useRouter();
    const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro'>('pro');
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        setLoading(true);
        // Simulated Checkout API Call
        try {
            const resp = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId: selectedPlan === 'pro' ? 'growth' : 'essencial',
                    isYearly: false,
                }),
            });

            if (resp.status === 401) {
                // Not authenticated
                router.push('/login?redirect=/pricing');
                return;
            }

            const data = await resp.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            alert('Erro ao processar assinatura. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface-base text-ink-body pb-32">
            <Section>
                <HeroHeader />

                <div className="space-y-md mt-md">
                    <PlanCard
                        title="Essencial"
                        price="R$ 97"
                        features={[
                            'Até 5.000 cotações mensais',
                            'Integração Bling e Tiny',
                            'Suporte em Horário Comercial',
                        ]}
                        isPremium={false}
                        isSelected={selectedPlan === 'basic'}
                        onSelect={() => setSelectedPlan('basic')}
                    />
                    <PlanCard
                        title="Growth"
                        price="R$ 297"
                        features={[
                            'Cotações Ilimitadas',
                            'Multi-transportadoras (Frenet, Mandaê, Melhor Envio)',
                            'Dashboard Observabilidade (Cockpit)',
                            'Automação de Tracking no WhatsApp',
                        ]}
                        isPremium={true}
                        isSelected={selectedPlan === 'pro'}
                        onSelect={() => setSelectedPlan('pro')}
                    />
                </div>

                <div className="mt-xl space-y-sm">
                    <DetailsAccordion title="Dúvidas Frequentes">
                        <p className="mb-2"><strong>Como funciona o cancelamento?</strong></p>
                        <p className="mb-4">Você pode cancelar a qualquer momento diretamente pelo seu painel financeiro. Não há multas ou taxas surpresa.</p>

                        <p className="mb-2"><strong>O WhatsApp é cobrado à parte?</strong></p>
                        <p>O plano Growth inclui o robô de rastreio grátis, mas as taxas de disparo de mensagens dependem da sua própria conta na Twilio.</p>
                    </DetailsAccordion>

                    <DetailsAccordion title="Segurança & Infraestrutura">
                        <p>Seus dados são criptografados em repouso e movimento e armazenados em zonas AWS redundantes. Contamos com um uptime histórico de 99.98%.</p>
                    </DetailsAccordion>
                </div>
            </Section>

            <StickyCTA
                isPremiumSelected={selectedPlan === 'pro'}
                onCheckout={handleCheckout}
                loading={loading}
            />
        </div>
    );
}
