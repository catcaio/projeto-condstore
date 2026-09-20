'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from './page-container';
import { PageSection } from './page-section';
import { SectionIntro } from './section-intro';

const faqs = [
    {
        question: 'O CONDSTORE OS é um ERP?',
        answer: 'Não. O CONDSTORE OS é um sistema operacional especializado em logística comercial e atendimento. Ele não substitui seu ERP, mas se integra a ele para potencializar o atendimento via WhatsApp, cotações de frete e gestão de pedidos.',
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
        question: 'A IA Frank responde sozinha ao cliente?',
        answer: 'Nunca. O Frank atua como um copiloto supervisionado. Ele organiza o contexto, sugere respostas e classifica intenções, mas a decisão final e o envio da mensagem são sempre validados por um operador humano.',
    },
    {
        question: 'Como funciona o piloto operacional?',
        answer: 'O piloto é uma fase de avaliação assistida onde configuramos seu tenant, conectamos seus canais e transportadoras, e acompanhamos a operação real por um período determinado para validar ganhos de eficiência.',
    },
    {
        question: 'Como funciona a cotação de frete?',
        answer: 'O sistema consulta tabelas de diversas transportadoras e Correios em tempo real. O operador visualiza as opções com margem aplicada e pode enviar a melhor cotação diretamente no chat do WhatsApp com um clique.',
    },
    {
        question: 'Como entram os pedidos e a logística?',
        answer: 'Quando uma cotação é aprovada no atendimento, ela é convertida em um pedido. A partir daí, o fluxo segue para a logística, onde são gerados os shipments e o rastreamento é iniciado automaticamente.',
    },
    {
        question: 'Como o gestor acompanha o time?',
        answer: 'Através do Cockpit Gerencial. O gestor visualiza em tempo real a fila de atendimento, SLAs de resposta, gargalos logísticos e métricas de conversão, tudo com rastro total de quem executou cada ação.',
    },
    {
        question: 'Como funciona a segurança e o isolamento de dados?',
        answer: 'Utilizamos arquitetura multi-tenant rigorosa. Cada empresa opera em um ambiente isolado (tenant), com criptografia de ponta a ponta para dados sensíveis e audit trail completo de todas as operações.',
    },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-[hsl(var(--ui-border)/0.3)]">
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between py-5 text-left gap-4 group"
            >
                <span className="text-base font-semibold text-[hsl(var(--ui-text))] group-hover:text-[hsl(var(--ui-accent-blue))] transition-colors">
                    {question}
                </span>
                <ChevronDown
                    className={cn(
                        'h-5 w-5 flex-shrink-0 text-[hsl(var(--ui-text-muted))] transition-transform duration-200',
                        open && 'rotate-180'
                    )}
                />
            </button>
            <div
                className={cn(
                    'overflow-hidden transition-all duration-300 ease-out',
                    open ? 'max-h-60 pb-5' : 'max-h-0'
                )}
            >
                <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed max-w-3xl">
                    {answer}
                </p>
            </div>
        </div>
    );
}

export function FaqSection() {
    return (
        <PageSection spacing="lg" borderTop>
            <PageContainer narrow>
                <SectionIntro
                    eyebrow="Perguntas frequentes"
                    title="Dúvidas? A gente responde."
                />
                <div className="mt-2">
                    {faqs.map((faq) => (
                        <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            </PageContainer>
        </PageSection>
    );
}
