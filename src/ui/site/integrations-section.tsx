'use client';

import React from 'react';
import { Share2, RefreshCw, Cpu, CheckCircle2 } from 'lucide-react';

const CONNECTORS = [
    { label: 'WhatsApp Web / API', detail: 'Entrada de conversas & negociações' },
    { label: 'Seu ERP Atual', detail: 'Consulta de cadastro & estoque' },
    { label: 'Transportadoras & Correios', detail: 'Cotação de frete & rastreio' },
    { label: 'CRM & Vendas', detail: 'Histórico de clientes & pós-venda' },
    { label: 'Serviços Externos / MCP', detail: 'Regras de negócio & automações' },
];

export function IntegrationsSection() {
    return (
        <section className="py-16 md:py-24 border-b border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface))]">
            <div className="mx-auto max-w-[var(--container-max-width)] px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-surface)/0.6)] text-xs font-semibold text-[hsl(var(--ui-text))] mb-3">
                        <Share2 className="h-3.5 w-3.5 text-[hsl(var(--ui-success))]" />
                        <span>Arquitetura sem Troca de ERP</span>
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-extrabold text-[hsl(var(--ui-text))] tracking-tight">
                        Sua operação já tem ferramentas. Elas não precisam ficar isoladas.
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        O CONDSTORE OS atua como uma camada de conexão. Ele não exige que você abandone seu ERP, troque de sistema de estoque ou mude a forma como seus clientes conversam.
                    </p>
                </div>

                {/* Hub and Spoke Visual Connectivity Diagram */}
                <div className="rounded-2xl border border-[hsl(var(--ui-border)/0.7)] bg-[hsl(var(--ui-surface-elevated)/0.4)] p-6 sm:p-10 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between pb-6 border-b border-[hsl(var(--ui-border)/0.4)] mb-8">
                        <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))]">
                            Teia de Conectividade Operacional
                        </span>
                        <span className="text-xs font-mono text-[hsl(var(--ui-success))] flex items-center gap-1.5">
                            <Cpu className="h-3.5 w-3.5" /> Suporte a APIs & MCP
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {CONNECTORS.map((item, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface))] space-y-2 relative"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[hsl(var(--ui-text))]">{item.label}</span>
                                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--ui-success))]" />
                                </div>
                                <p className="text-[11px] text-[hsl(var(--ui-text-muted))]">{item.detail}</p>
                            </div>
                        ))}
                        <div className="p-4 rounded-xl border border-dashed border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-surface)/0.3)] flex items-center justify-center text-xs text-[hsl(var(--ui-text-subtle))] font-medium text-center">
                            + Novas integrações sob demanda
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[hsl(var(--ui-border)/0.3)] text-center text-xs text-[hsl(var(--ui-text-muted))]">
                        Conecte o que você já usa hoje e amplie o que sua equipe consegue entregar com a mesma estrutura.
                    </div>
                </div>
            </div>
        </section>
    );
}
