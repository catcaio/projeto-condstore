'use client';

import { Check, ArrowRight, Sparkles, Info } from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection, CTASection, FlowSection,
} from '@/ui/site';
import { PlanDetailDrawer, usePlanDrawer } from '@/ui/site/plan-detail-drawer';
import { PlanComparisonGrid } from '@/ui/site/plan-comparison-grid';
import Link from 'next/link';

const plans = [
    {
        name: 'Operação',
        badge: 'Primeiro nível',
        monthlyRange: 'R$ 2.990 – R$ 3.490',
        monthlyNote: '/mês',
        implantation: 'a partir de R$ 14.900',
        description: 'Para operações que precisam sair do improviso e organizar atendimento, contexto e execução.',
        features: [
            'Cotação multi-transportadora',
            'Gestão de pedidos e clientes',
            'Cockpit operacional',
            'WhatsApp integrado',
            'App do ecossistema',
            'Suporte prioritário',
        ],
        cta: { label: 'Falar sobre Operação', href: '/about' },
        featured: false,
    },
    {
        name: 'Crescimento',
        badge: 'Recomendado',
        monthlyRange: 'R$ 7.990 – R$ 9.490',
        monthlyNote: '/mês',
        implantation: 'a partir de R$ 39.900',
        description: 'Para operações em expansão que precisam de mais integração, automação e inteligência em escala.',
        features: [
            'Tudo do Operação',
            'Automações configuráveis',
            'Integrações com ERP',
            'Frank Supremo — IA operacional',
            'Métricas avançadas',
            'Multi-tenant',
            'App com perfis expandidos',
        ],
        cta: { label: 'Solicitar proposta', href: '/about' },
        featured: true,
    },
    {
        name: 'Domínio',
        badge: 'Enterprise',
        monthlyRange: 'R$ 19.990 – R$ 23.990',
        monthlyNote: '/mês',
        implantation: 'R$ 99.900 – R$ 199.900',
        description: 'Implantação completa com personalização profunda, governança avançada e acompanhamento contínuo.',
        features: [
            'Tudo do Crescimento',
            'Implantação sob medida',
            'Integrações customizadas',
            'SLA dedicado',
            'Governança avançada',
            'Treinamento presencial',
            'Roadmap compartilhado',
            'App com branding próprio',
        ],
        cta: { label: 'Falar com o time', href: '/about' },
        featured: false,
    },
];

export default function ValoresPage() {
    const { activePlan, openDrawer, closeDrawer } = usePlanDrawer();

    return (
        <>
            {/* ─── HERO ─── */}
            <HeroSection
                eyebrow="Valores"
                title={
                    <>
                        Infraestrutura operacional{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            com valor proporcional ao impacto.
                        </span>
                    </>
                }
                subtitle="Valores personalizados com base no tamanho da sua operação, nível de automação e integrações necessárias."
                ctas={[
                    { label: 'Falar sobre implantação', href: '/about' },
                    { label: 'Solicitar demonstração', href: '/about', variant: 'secondary' },
                ]}
            />

            {/* ─── CONTEXTO ─── */}
            <PageSection spacing="md" borderTop>
                <PageContainer narrow>
                    <div className="text-center space-y-3">
                        <p className="text-lg md:text-xl text-[hsl(var(--ui-text-muted))] leading-relaxed">
                            O valor final é definido com base em:
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {['Implantação', 'Volume operacional', 'Integrações', 'Nível de automação'].map((tag) => (
                                <span key={tag} className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold bg-[hsl(var(--ui-accent-blue)/0.08)] text-[hsl(var(--ui-accent-blue))]">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── PLANOS ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col rounded-2xl border p-7 md:p-8 transition-all ${
                                    plan.featured
                                        ? 'border-[hsl(var(--ui-accent-blue)/0.5)] bg-[hsl(var(--ui-accent-blue)/0.04)] shadow-lg shadow-[hsl(var(--ui-accent-blue)/0.08)] lg:scale-[1.03]'
                                        : 'border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)]'
                                }`}
                            >
                                {/* Badge */}
                                <span className={`inline-flex self-start items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] mb-5 ${
                                    plan.featured
                                        ? 'bg-[hsl(var(--ui-accent-blue)/0.15)] text-[hsl(var(--ui-accent-blue))]'
                                        : 'bg-[hsl(var(--ui-muted)/0.5)] text-[hsl(var(--ui-text-subtle))]'
                                }`}>
                                    {plan.featured && <Sparkles className="h-3 w-3" />}
                                    {plan.badge}
                                </span>

                                {/* Name */}
                                <h3 className="text-2xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight mb-2">{plan.name}</h3>

                                {/* Price */}
                                <div className="mb-1">
                                    <span className="text-lg font-bold text-[hsl(var(--ui-text))]">{plan.monthlyRange}</span>
                                    <span className="text-sm text-[hsl(var(--ui-text-subtle))] ml-1">{plan.monthlyNote}</span>
                                </div>
                                <div className="mb-5">
                                    <span className="text-xs text-[hsl(var(--ui-text-subtle))]">Implantação: {plan.implantation}</span>
                                </div>

                                <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed mb-6">
                                    {plan.description}
                                </p>

                                {/* Features */}
                                <ul className="flex-1 space-y-2.5 mb-5">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2.5 text-sm text-[hsl(var(--ui-text-muted))]">
                                            <Check className="h-4 w-4 text-[hsl(var(--ui-success))] flex-shrink-0 mt-0.5" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                {/* Ver detalhes button */}
                                <button
                                    onClick={() => openDrawer(plan.name)}
                                    className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[hsl(var(--ui-accent-blue))] hover:text-[hsl(var(--ui-accent-blue-strong))] transition-colors mb-4 py-2"
                                >
                                    <Info className="h-3.5 w-3.5" />
                                    Ver detalhes do plano
                                </button>

                                {/* CTA */}
                                <Link
                                    href={plan.cta.href}
                                    className={`inline-flex items-center justify-center rounded-full text-sm font-bold h-12 px-6 transition-all w-full ${
                                        plan.featured
                                            ? 'bg-[hsl(var(--ui-accent-blue))] text-white hover:bg-[hsl(var(--ui-accent-blue-strong))] shadow-sm'
                                            : 'border border-[hsl(var(--ui-border))] text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-surface-elevated))]'
                                    }`}
                                >
                                    {plan.cta.label}
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Link>
                            </div>
                        ))}
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── COMPARISON GRID ─── */}
            <PlanComparisonGrid />

            {/* ─── COMO A CONTRATAÇÃO ACONTECE ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer>
                    <SectionIntro
                        eyebrow="Processo"
                        title="Como a contratação acontece."
                        description="Não vendemos por checkout. Cada operação é dimensionada para o seu contexto."
                    />
                    <FlowSection
                        steps={[
                            { number: '01', title: 'Diagnóstico', description: 'Entendemos o fluxo, os canais, a equipe e o nível de maturidade da operação.' },
                            { number: '02', title: 'Enquadramento', description: 'Definimos módulos, integrações e nível de automação adequados.' },
                            { number: '03', title: 'Implantação', description: 'Configuramos a plataforma, ativamos integrações e treinamos a equipe.' },
                            { number: '04', title: 'Ativação', description: 'Sistema no ar com acompanhamento ativo nos primeiros ciclos.' },
                        ]}
                    />
                </PageContainer>
            </PageSection>

            {/* ─── NOTA ─── */}
            <PageSection spacing="md" borderTop>
                <PageContainer narrow>
                    <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)] p-6 md:p-8 text-center">
                        <h3 className="text-base font-bold text-[hsl(var(--ui-text))] mb-2 tracking-tight">
                            Valores são definidos em conversa, não em checkout.
                        </h3>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-2xl mx-auto">
                            O Condstore OS não é um produto de prateleira. Cada implantação é dimensionada para o
                            contexto da sua operação — volume, integrações, equipe e maturidade logística.
                        </p>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── CTA FINAL ─── */}
            <CTASection
                title="Quer entender qual plano faz sentido para a sua operação?"
                subtitle="Vamos conversar sobre o seu contexto."
                ctas={[
                    { label: 'Solicitar demonstração', href: '/about' },
                    { label: 'Explorar soluções', href: '/solucoes', variant: 'secondary' },
                ]}
            />

            {/* ─── PLAN DETAIL DRAWER ─── */}
            <PlanDetailDrawer planName={activePlan} onClose={closeDrawer} />
        </>
    );
}
