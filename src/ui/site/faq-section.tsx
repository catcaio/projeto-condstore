'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageContainer } from './page-container';
import { PageSection } from './page-section';
import { SectionIntro } from './section-intro';

const faqs = [
    {
        question: 'O Condstore OS integra com meu ERP atual?',
        answer: 'Sim. O Condstore OS não substitui seu ERP — ele complementa. Conectamos via webhook e API REST para sincronizar pedidos, notas e status de entrega. Se seu ERP tem API, integramos.',
    },
    {
        question: 'Quanto tempo leva a implantação?',
        answer: 'A operação básica roda em dias. Criamos o tenant, importamos suas tabelas de frete, configuramos transportadoras e WhatsApp. Em projetos com integrações customizadas, o prazo pode chegar a 2-3 semanas.',
    },
    {
        question: 'Como funciona a segurança dos dados?',
        answer: 'Arquitetura multi-tenant com isolamento por tenant. RBAC nativo, audit trail completo, encriptação de dados sensíveis (AES-256-GCM), hashing de PII, e detecção de anomalias. Zero-trust por padrão.',
    },
    {
        question: 'O WhatsApp é realmente integrado?',
        answer: 'Sim. Usamos a API oficial do WhatsApp Business via Twilio. O Frank Supremo processa mensagens, identifica intenções, gera cotações e cria pedidos — tudo automaticamente, com contexto de sessão.',
    },
    {
        question: 'Posso usar junto com meu sistema atual?',
        answer: 'Totalmente. O Condstore OS opera como camada de inteligência sobre sua operação. Você pode adotar módulos gradualmente: começar pelo frete, depois adicionar CRM, atendimento e IA.',
    },
    {
        question: 'Como funciona o multi-tenant?',
        answer: 'Cada empresa opera em um tenant isolado com seus próprios dados, usuários, configurações e chaves de API. Um único login permite alternar entre contas — ideal para operadores logísticos que gerenciam múltiplos embarcadores.',
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
