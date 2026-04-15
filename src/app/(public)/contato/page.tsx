import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageContainer, PageSection, SectionIntro } from '@/ui/site';
import { ContatoForm } from './contato-form';

export const metadata: Metadata = {
    title: 'Contato — Condstore OS',
    description:
        'Entre em contato com o time do Condstore OS. Demonstração guiada pelo contexto real da sua operação logística B2B.',
};

const qualificationPoints = [
    {
        label: 'Operações com cotação e despacho manual',
        detail: 'Volume de frete processado em planilha, WhatsApp ou ferramentas separadas.',
    },
    {
        label: 'Times que precisam de CRM conectado a pedidos',
        detail: 'Não um CRM genérico — um pipeline diretamente ligado à logística.',
    },
    {
        label: 'Atendimento B2B com necessidade de automação',
        detail: 'Conversas contextualizadas por cliente, pedido e histórico.',
    },
    {
        label: 'Quem já tentou ferramentas genéricas',
        detail: 'E precisa de infraestrutura construída para operação logística real.',
    },
];

const continuityLinks = [
    { label: 'Prova operacional', href: '/casos', desc: 'Veja como funciona na prática' },
    { label: 'Como funciona', href: '/como-funciona', desc: 'Fluxo do pedido à entrega' },
    { label: 'Soluções', href: '/solucoes', desc: 'Módulos e responsabilidades' },
    { label: 'Entrar na plataforma', href: '/login', desc: 'Acessar sua conta' },
];

export default function ContatoPage() {
    return (
        <>
            {/* ─── HERO ─── */}
            <PageSection spacing="xl">
                <PageContainer narrow>
                    <SectionIntro
                        eyebrow="Contato"
                        title="A conversa começa aqui."
                        description="Demonstração guiada pelo contexto real da sua operação. Sem apresentação genérica, sem script de vendas."
                    />
                </PageContainer>
            </PageSection>

            {/* ─── QUALIFICAÇÃO + FORMULÁRIO ─── */}
            <PageSection spacing="lg" borderTop>
                <PageContainer narrow>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 items-start">

                        {/* Bloco de qualificação */}
                        <div className="lg:col-span-2 lg:pt-1">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--ui-text-subtle))] mb-6">
                                Para quem faz sentido
                            </p>
                            <ul className="space-y-6">
                                {qualificationPoints.map((point) => (
                                    <li key={point.label} className="flex gap-3">
                                        <span
                                            className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--ui-accent-blue)/0.3)] bg-[hsl(var(--ui-accent-blue)/0.08)]"
                                            aria-hidden="true"
                                        >
                                            <span className="block h-1.5 w-1.5 rounded-full bg-[hsl(var(--ui-accent-blue))]" />
                                        </span>
                                        <div>
                                            <p className="text-sm font-semibold text-[hsl(var(--ui-text))] leading-snug">
                                                {point.label}
                                            </p>
                                            <p className="mt-0.5 text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                                {point.detail}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-10 rounded-xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface))] p-5">
                                <p className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                    A demonstração é guiada pelo que você preencher. Quanto mais
                                    contexto, mais objetiva a conversa.
                                </p>
                            </div>
                        </div>

                        {/* Formulário */}
                        <div className="lg:col-span-3 rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface))] p-8 md:p-10">
                            <ContatoForm />
                        </div>
                    </div>
                </PageContainer>
            </PageSection>

            {/* ─── CONTINUIDADE ─── */}
            <PageSection spacing="md" borderTop>
                <PageContainer narrow>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--ui-text-subtle))] mb-6 text-center">
                        Continue explorando
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {continuityLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="group flex flex-col gap-1.5 rounded-xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface))] px-5 py-4 transition-all duration-150 hover:border-[hsl(var(--ui-border-strong))] hover:bg-[hsl(var(--ui-surface-elevated))]"
                            >
                                <span className="text-sm font-semibold text-[hsl(var(--ui-text))] leading-snug">
                                    {link.label}
                                </span>
                                <span className="text-xs text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                    {link.desc}
                                </span>
                                <ArrowRight className="mt-1 h-3.5 w-3.5 text-[hsl(var(--ui-text-subtle))] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-[hsl(var(--ui-accent-blue))]" />
                            </Link>
                        ))}
                    </div>
                </PageContainer>
            </PageSection>
        </>
    );
}
