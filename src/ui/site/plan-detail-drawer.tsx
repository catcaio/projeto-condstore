'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanSection {
    title: string;
    content: string;
}

export interface PlanDetail {
    name: string;
    sections: PlanSection[];
}

const planDetails: Record<string, PlanDetail> = {
    'Operação': {
        name: 'Operação',
        sections: [
            {
                title: 'Visão geral do plano',
                content: 'Ideal para operações que estão saindo do improviso. Organiza atendimento, contexto e execução com as ferramentas essenciais do Condstore OS. Indicado para distribuidores com até 100 envios/dia e equipes de até 10 operadores.',
            },
            {
                title: 'Implantação',
                content: 'Configuração guiada com onboarding completo. Inclui setup de tenant, importação de tabelas de frete, configuração de transportadoras e ativação do WhatsApp Business. Prazo estimado: 5 a 10 dias úteis.',
            },
            {
                title: 'Integrações',
                content: 'WhatsApp Business API (via Twilio), conectores de transportadoras (Melhor Envio, tabelas próprias), webhooks para notificação de eventos. Integrações com ERP não estão incluídas neste plano.',
            },
            {
                title: 'Automação',
                content: 'Cotação automática multi-transportadora, criação de pedidos a partir de conversas, tracking integrado. Automações customizáveis não estão disponíveis — fluxos seguem o padrão da plataforma.',
            },
            {
                title: 'Governança',
                content: 'Multi-tenant com isolamento de dados, RBAC básico (admin e operador), audit trail de eventos operacionais. Detecção de anomalias e governança avançada são features dos planos superiores.',
            },
            {
                title: 'Suporte',
                content: 'Suporte prioritário por e-mail e WhatsApp em horário comercial (seg-sex, 9h-18h). SLA de resposta: até 4 horas úteis. Sem suporte presencial ou dedicado.',
            },
        ],
    },
    'Crescimento': {
        name: 'Crescimento',
        sections: [
            {
                title: 'Visão geral do plano',
                content: 'Para operações em expansão que precisam de inteligência, automação e integração em escala. Indicado para distribuidores com 100-500 envios/dia, operadores logísticos com múltiplos embarcadores, e equipes de 10-50 pessoas.',
            },
            {
                title: 'Implantação',
                content: 'Implantação assistida com arquiteto de solução dedicado. Inclui diagnóstico operacional, mapeamento de fluxos, configuração de integrações e treinamento da equipe. Prazo estimado: 2 a 4 semanas.',
            },
            {
                title: 'Integrações',
                content: 'Tudo do Operação + integração bidirecional com ERPs (SAP, TOTVS, Bling, Tiny). API REST completa para automação. Webhooks configuráveis para eventos de pedido, frete e atendimento.',
            },
            {
                title: 'Automação',
                content: 'Automações configuráveis de fluxo (regras de roteamento, escalonamento, alertas). Frank Supremo ativo: IA operacional que analisa padrões, sugere ações e automatiza atendimento via WhatsApp.',
            },
            {
                title: 'Governança',
                content: 'Multi-tenant completo, RBAC granular (admin, gestor, operador, viewer), audit trail avançado, detecção de anomalias, métricas de SLA e performance por transportadora/região.',
            },
            {
                title: 'Suporte',
                content: 'Suporte dedicado com gerente de conta. Atendimento em horário estendido (8h-20h). SLA de resposta: até 2 horas. Reuniões de acompanhamento mensais. Acesso a roadmap de features.',
            },
        ],
    },
    'Domínio': {
        name: 'Domínio',
        sections: [
            {
                title: 'Visão geral do plano',
                content: 'Implantação enterprise completa com personalização profunda. Para operações acima de 500 envios/dia, grandes distribuidores, operadores logísticos com governança exigente e empresas com requisitos regulatórios específicos.',
            },
            {
                title: 'Implantação',
                content: 'Projeto de implantação sob medida com squad dedicado (PM + dev + arquiteto). Diagnóstico operacional profundo, migração de dados, integrações customizadas, treinamento presencial e acompanhamento nos primeiros 90 dias.',
            },
            {
                title: 'Integrações',
                content: 'Tudo do Crescimento + integrações customizadas sob demanda (WMS, TMS, sistemas legados). Conectores dedicados, middleware customizado e suporte a protocolos específicos (EDI, XML legado).',
            },
            {
                title: 'Automação',
                content: 'Automação total com playbooks personalizados, regras de negócio customizadas, Frank Supremo em modo avançado com treinamento específico para o vocabulário e processos da operação.',
            },
            {
                title: 'Governança',
                content: 'Governança enterprise: SSO/SAML, políticas de retenção configuráveis, compliance LGPD completo, relatórios de auditoria exportáveis, SLA contratual com penalidades, branding próprio no app.',
            },
            {
                title: 'Suporte',
                content: 'Suporte 24/7 com equipe dedicada. SLA contratual de 30 minutos para incidentes críticos. Gerente de sucesso dedicado, reuniões semanais, roadmap compartilhado com priorização de features.',
            },
        ],
    },
};

interface PlanDetailDrawerProps {
    planName: string | null;
    onClose: () => void;
}

export function PlanDetailDrawer({ planName, onClose }: PlanDetailDrawerProps) {
    const detail = planName ? planDetails[planName] : null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 z-50 bg-[hsl(var(--ui-shadow)/0.4)] backdrop-blur-sm transition-opacity duration-300',
                    planName ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    'fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-[hsl(var(--ui-page))] border-l border-[hsl(var(--ui-border)/0.3)] shadow-2xl transition-transform duration-300 ease-out overflow-y-auto',
                    planName ? 'translate-x-0' : 'translate-x-full'
                )}
            >
                {detail && (
                    <div className="p-6 md:p-8">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                                {detail.name}
                            </h2>
                            <button
                                onClick={onClose}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--ui-border)/0.4)] hover:bg-[hsl(var(--ui-surface-elevated))] transition-colors"
                            >
                                <X className="h-4 w-4 text-[hsl(var(--ui-text-muted))]" />
                            </button>
                        </div>

                        {/* Sections */}
                        <div className="space-y-6">
                            {detail.sections.map((section, i) => (
                                <div key={section.title}>
                                    <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] uppercase tracking-[0.1em] mb-2">
                                        {section.title}
                                    </h3>
                                    <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                        {section.content}
                                    </p>
                                    {i < detail.sections.length - 1 && (
                                        <div className="mt-6 border-t border-[hsl(var(--ui-border)/0.2)]" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export function usePlanDrawer() {
    const [activePlan, setActivePlan] = useState<string | null>(null);
    return {
        activePlan,
        openDrawer: (name: string) => setActivePlan(name),
        closeDrawer: () => setActivePlan(null),
    };
}
