'use client';

import React from 'react';
import { Network, Database, MessageSquare, Layers, Cpu, ShieldCheck, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLATFORM_CAPABILITIES = [
    {
        title: 'Mensageria Unificada',
        desc: 'WhatsApp como hub central de conversas com histórico completo, múltiplos atendentes e contexto comercial preservado.',
        badge: 'Base de Atendimento',
        icon: MessageSquare,
    },
    {
        title: 'CRM Conectado à Operação',
        desc: 'Sem Kanbans genéricos. O relacionamento com o cliente nasce da negociação real, mantendo dados de compras e preferências.',
        badge: 'Relacionamento B2B',
        icon: Database,
    },
    {
        title: 'Cotação & Frete Inteligente',
        desc: 'Consulta em tempo real de múltiplas transportadoras com aplicação de margem e envio da proposta na conversa.',
        badge: 'Logística Comercial',
        icon: Zap,
    },
    {
        title: 'Gestão de Pedidos & Execução',
        desc: 'Validação operacional em um clique, transformando cotações aceitas em pedidos rastreáveis com dono e timestamp.',
        badge: 'Execução Flutuante',
        icon: Layers,
    },
    {
        title: 'Conhecimento Acumulado',
        desc: 'A operação aprende padrões de compras, rotas preferidas e regras de desconto para agilizar tratativas futuras.',
        badge: 'Inteligência Passiva',
        icon: ShieldCheck,
    },
    {
        title: 'Integrações via API & MCP',
        desc: 'Conecte seu ERP existente ou novas ferramentas sem precisar reconstruir sua infraestrutura de tecnologia.',
        badge: 'Arquitetura Aberta',
        icon: Cpu,
    },
];

export function ExpandedPlatformScopeSection() {
    return (
        <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.3)]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-surface)/0.6)] text-xs font-semibold text-[hsl(var(--ui-text))] mb-3">
                        <Network className="h-3.5 w-3.5 text-[hsl(var(--ui-success))]" />
                        <span>Plataforma que Evolui com Você</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                        Começa com um fluxo. Cresce com a sua operação.
                    </h2>

                    <p className="mt-4 text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        O CONDSTORE OS vai além de cotar frete no WhatsApp. Ele se consolida como a camada operacional que conecta mensageria, CRM, logística e inteligência em um único ecossistema.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {PLATFORM_CAPABILITIES.map((cap, idx) => {
                        const Icon = cap.icon;
                        return (
                            <div
                                key={idx}
                                className="rounded-2xl border border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface))] p-6 space-y-4 transition-all hover:border-[hsl(var(--ui-border-strong))] flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="h-10 w-10 rounded-xl bg-[hsl(var(--ui-muted)/0.5)] flex items-center justify-center text-[hsl(var(--ui-text))]">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[hsl(var(--ui-border-strong))] text-[hsl(var(--ui-text-subtle))]">
                                            {cap.badge}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-[hsl(var(--ui-text))]">{cap.title}</h3>
                                    <p className="text-xs sm:text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">{cap.desc}</p>
                                </div>

                                <div className="pt-3 border-t border-[hsl(var(--ui-border)/0.3)] flex items-center justify-between text-[11px] font-mono text-[hsl(var(--ui-text-subtle))]">
                                    <span>Capacidade Preservada</span>
                                    <span className="text-[hsl(var(--ui-success))]">● Ativo</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
