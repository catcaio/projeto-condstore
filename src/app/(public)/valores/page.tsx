import { Check, ArrowRight } from 'lucide-react';
import {
    PageContainer, PageSection, SectionIntro, HeroSection, CTASection,
} from '@/ui/site';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Valores — Condstore OS',
    description: 'Conheça os planos do Condstore OS. Valores personalizados com base em volume, integrações e nível de automação.',
};

const plans = [
    {
        name: 'Conhecer',
        badge: 'Exploratório',
        price: '14 dias',
        priceNote: 'sem compromisso',
        description: 'Entenda o fluxo, explore os módulos e veja o sistema por dentro antes de decidir.',
        features: [
            'Acesso guiado à plataforma',
            'Módulos essenciais ativados',
            'Onboarding assistido',
            'Sem cartão de crédito',
        ],
        cta: { label: 'Começar gratuitamente', href: '/signup' },
        featured: false,
    },
    {
        name: 'Operação',
        badge: 'Mais popular',
        price: 'Sob consulta',
        priceNote: 'baseado no volume',
        description: 'Primeiro nível operacional com cotação, pedidos, CRM e cockpit para equipes que estão profissionalizando.',
        features: [
            'Cotação multi-transportadora',
            'Gestão de pedidos e clientes',
            'Cockpit operacional',
            'WhatsApp integrado',
            'Suporte prioritário',
        ],
        cta: { label: 'Falar sobre valores', href: '/about' },
        featured: true,
    },
    {
        name: 'Crescimento',
        badge: 'Escala',
        price: 'Sob consulta',
        priceNote: 'para operações em expansão',
        description: 'Para quem já opera e precisa de mais automação, integrações e inteligência à medida que cresce.',
        features: [
            'Tudo do Operação',
            'Automações configuráveis',
            'Integrações com ERP',
            'Frank Supremo — IA operacional',
            'Métricas avançadas',
            'Multi-tenant',
        ],
        cta: { label: 'Solicitar proposta', href: '/about' },
        featured: false,
    },
    {
        name: 'Domínio',
        badge: 'Enterprise',
        price: 'Personalizado',
        priceNote: 'implantação profunda',
        description: 'Implantação completa com configuração dedicada, integrações customizadas e acompanhamento contínuo.',
        features: [
            'Tudo do Crescimento',
            'Implantação sob medida',
            'Integrações customizadas',
            'SLA dedicado',
            'Governança avançada',
            'Treinamento presencial',
            'Roadmap compartilhado',
        ],
        cta: { label: 'Falar com o time', href: '/about' },
        featured: false,
    },
];

export default function ValoresPage() {
    return (
        <>
            {/* ─── HERO ─── */}
            <HeroSection
                eyebrow="Valores"
                title={
                    <>
                        Conheça o{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--ui-accent-blue))] to-[hsl(211,100%,72%)]">
                            Condstore OS.
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
                            Cada operação é diferente. Por isso, os valores são definidos com base em:
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {['Implantação', 'Volume', 'Integrações', 'Nível de automação'].map((tag) => (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative flex flex-col rounded-2xl border p-6 md:p-7 transition-all ${
                                    plan.featured
                                        ? 'border-[hsl(var(--ui-accent-blue)/0.5)] bg-[hsl(var(--ui-accent-blue)/0.04)] shadow-lg shadow-[hsl(var(--ui-accent-blue)/0.08)]'
                                        : 'border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)]'
                                }`}
                            >
                                {/* Badge */}
                                <span className={`inline-flex self-start items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] mb-4 ${
                                    plan.featured
                                        ? 'bg-[hsl(var(--ui-accent-blue)/0.15)] text-[hsl(var(--ui-accent-blue))]'
                                        : 'bg-[hsl(var(--ui-muted)/0.5)] text-[hsl(var(--ui-text-subtle))]'
                                }`}>
                                    {plan.badge}
                                </span>

                                {/* Name + Price */}
                                <h3 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight mb-1">{plan.name}</h3>
                                <div className="mb-4">
                                    <span className="text-2xl font-extrabold text-[hsl(var(--ui-text))]">{plan.price}</span>
                                    <span className="text-xs text-[hsl(var(--ui-text-subtle))] ml-2">{plan.priceNote}</span>
                                </div>

                                <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed mb-6">
                                    {plan.description}
                                </p>

                                {/* Features */}
                                <ul className="flex-1 space-y-2.5 mb-6">
                                    {plan.features.map((f) => (
                                        <li key={f} className="flex items-start gap-2.5 text-sm text-[hsl(var(--ui-text-muted))]">
                                            <Check className="h-4 w-4 text-[hsl(var(--ui-success))] flex-shrink-0 mt-0.5" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <Link
                                    href={plan.cta.href}
                                    className={`inline-flex items-center justify-center rounded-full text-sm font-bold h-11 px-6 transition-all w-full ${
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
        </>
    );
}
