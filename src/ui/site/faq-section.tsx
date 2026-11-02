'use client';

import { useState, useId } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from './page-container';
import { PageSection } from './page-section';
import { SectionIntro } from './section-intro';
import { SiteCard } from './site-card';

export interface FaqItemData {
    question: string;
    answer: string;
}

export const allFaqs: FaqItemData[] = [
    {
        question: 'O CONDSTORE OS é um ERP?',
        answer: 'Não. O CONDSTORE OS é um sistema operacional especializado em logística comercial e atendimento. Ele não substitui seu ERP, mas se integra a ele para potencializar o atendimento via WhatsApp, cotações de frete e gestão de pedidos.',
    },
    {
        question: 'A IA Frank responde sozinha ao cliente?',
        answer: 'Nunca. O Frank atua como um copiloto supervisionado. Ele organiza o contexto, sugere respostas e classifica intenções, mas a decisão final e o envio da mensagem são sempre validados por um operador humano.',
    },
    {
        question: 'Como funciona a cotação de frete?',
        answer: 'O sistema consulta tabelas de diversas transportadoras e Correios em tempo real. O operador visualiza as opções com margem aplicada e pode enviar a melhor cotação diretamente no chat do WhatsApp com um clique.',
    },
    {
        question: 'Como funciona a segurança e o isolamento de dados?',
        answer: 'Utilizamos arquitetura multi-tenant rigorosa. Cada empresa opera em um ambiente isolado (tenant), com criptografia de ponta a ponta para dados sensíveis e audit trail completo de todas as operações.',
    },
    {
        question: 'O sistema emite Nota Fiscal (NF-e)?',
        answer: 'Nesta fase do MVP, o CONDSTORE OS não realiza emissão fiscal direta. Nós nos conectamos ao seu ERP ou emissor atual para garantir que o fluxo de pedido e logística seja fluido e integrado.',
    },
    {
        question: 'Integra com marketplaces?',
        answer: 'Sim, via ERP ou integrações diretas pontuais. O foco do CONDSTORE OS é centralizar a operação que hoje acontece de forma fragmentada, permitindo que pedidos de diferentes origens sigam o mesmo fluxo de cotação e logística.',
    },
    {
        question: 'O CONDSTORE OS é omnichannel?',
        answer: 'Focamos no canal de maior conversão e complexidade operacional hoje: o WhatsApp. Embora tenhamos planos para outros canais, nossa entrega atual é a melhor experiência de WhatsApp CRM integrada à logística do mercado.',
    },
    {
        question: 'Como funciona o piloto operacional?',
        answer: 'O piloto é uma fase de avaliação assistida onde configuramos seu tenant, conectamos seus canais e transportadoras, e acompanhamos a operação real por um período determinado para validar ganhos de eficiência.',
    },
    {
        question: 'Como entram os pedidos e a logística?',
        answer: 'Quando uma cotação é aprovada no atendimento, ela é convertida em um pedido. A partir daí, o fluxo segue para a logística, onde são gerados os shipments e o rastreamento é iniciado automaticamente.',
    },
    {
        question: 'Como o gestor acompanha o time?',
        answer: 'Através do Cockpit Gerencial. O gestor visualiza em tempo real a fila de atendimento, SLAs de resposta, gargalos logísticos e métricas de conversão, tudo com rastro total de quem executou cada ação.',
    },
];

export function FaqItem({
    question,
    answer,
    isLast,
    index,
}: {
    question: string;
    answer: string;
    isLast?: boolean;
    index: number;
}) {
    const [open, setOpen] = useState(false);
    const baseId = useId();
    const buttonId = `faq-trigger-${baseId}-${index}`;
    const panelId = `faq-panel-${baseId}-${index}`;

    return (
        <div className={cn(!isLast && 'border-b border-[hsl(var(--ui-border)/0.3)]')}>
            <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen(!open)}
                onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setOpen(!open);
                    }
                }}
                className="flex w-full items-center justify-between py-4 text-left gap-4 group rounded-lg px-2 -mx-2 transition-colors hover:bg-[hsl(var(--ui-surface-elevated)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))]"
            >
                <span className="text-sm sm:text-base font-semibold text-[hsl(var(--ui-text))] group-hover:text-[hsl(var(--ui-accent-blue))] transition-colors">
                    {question}
                </span>
                <ChevronDown
                    className={cn(
                        'h-4 w-4 flex-shrink-0 text-[hsl(var(--ui-text-muted))] transition-transform duration-200',
                        open && 'rotate-180'
                    )}
                    aria-hidden="true"
                />
            </button>
            <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!open}
                className={cn(
                    'transition-all duration-200 ease-out px-2 -mx-2',
                    open ? 'pb-4 block opacity-100' : 'hidden opacity-0'
                )}
            >
                <p className="text-xs sm:text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-3xl">
                    {answer}
                </p>
            </div>
        </div>
    );
}

export function FaqSection({
    limit,
    showLinkToAll = false,
}: {
    limit?: number;
    showLinkToAll?: boolean;
}) {
    const items = limit ? allFaqs.slice(0, limit) : allFaqs;

    return (
        <PageSection spacing="md" borderTop>
            <PageContainer narrow>
                <SectionIntro
                    eyebrow="Perguntas frequentes"
                    title="Dúvidas de Decisão Operacional"
                    description="Respostas objetivas sobre escopo, segurança e como o CONDSTORE OS se conecta à sua distribuidora."
                />
                <div className="mt-6">
                    <SiteCard variant="default" className="p-4 sm:p-6">
                        {items.map((faq, index) => (
                            <FaqItem
                                key={faq.question}
                                question={faq.question}
                                answer={faq.answer}
                                index={index}
                                isLast={index === items.length - 1}
                            />
                        ))}
                    </SiteCard>
                    {showLinkToAll && (
                        <div className="mt-5 text-center">
                            <Link
                                href="/faq"
                                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[hsl(var(--ui-accent-blue))] hover:underline"
                            >
                                Ver todas as 10 perguntas e respostas sobre a plataforma
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    )}
                </div>
            </PageContainer>
        </PageSection>
    );
}
