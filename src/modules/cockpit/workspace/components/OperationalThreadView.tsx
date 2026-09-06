'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    User,
    MessageSquare,
    FileText,
    Package,
    Truck,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from 'lucide-react';
import type { CockpitActionQueueItem, OperationalThreadStage } from '../../data/shared';
import { formatCurrency } from '../../data/shared';

export interface OperationalThreadViewProps {
    item: CockpitActionQueueItem;
    onSelectStage?: (stage: OperationalThreadStage) => void;
}

const STAGES: Array<{
    id: OperationalThreadStage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
}> = [
    { id: 'cliente', label: 'Cliente', icon: User },
    { id: 'atendimento', label: 'Atendimento', icon: MessageSquare },
    { id: 'cotacao', label: 'Cotação', icon: FileText },
    { id: 'pedido', label: 'Pedido', icon: Package },
    { id: 'logistica', label: 'Logística', icon: Truck },
];

export function OperationalThreadView({ item }: OperationalThreadViewProps) {
    const thread = item.operationalThread;
    const [expandedStage, setExpandedStage] = useState<OperationalThreadStage | null>(
        thread.blockedStage ?? thread.activeStage ?? 'atendimento'
    );

    const toggleStage = (stage: OperationalThreadStage) => {
        setExpandedStage((prev) => (prev === stage ? null : stage));
    };

    const isStagePresent = (stage: OperationalThreadStage) => {
        switch (stage) {
            case 'cliente':
                return Boolean(thread.customer?.name || thread.customer?.phone || item.customer?.phone);
            case 'atendimento':
                return Boolean(thread.conversation?.phoneKey || item.conversation?.phoneKey || item.category === 'conversation');
            case 'cotacao':
                return Boolean(thread.quotation?.id || item.quotation?.id || item.category === 'freight');
            case 'pedido':
                return Boolean(thread.order?.id || item.order?.id || item.category === 'order');
            case 'logistica':
                return Boolean(thread.shipment?.id || item.shipment?.id);
            default:
                return false;
        }
    };

    return (
        <div className="space-y-3 bg-[hsl(var(--ui-page))] p-3.5 rounded-xl border border-[hsl(var(--ui-border))]">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))] flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--ui-accent-blue-ink))]" />
                    Operational Thread
                </span>
                {thread.blockedStage && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Bloqueado em {thread.blockedStage.toUpperCase()}
                    </span>
                )}
            </div>

            {/* Stepper Bar */}
            <div className="grid grid-cols-5 gap-1 py-1">
                {STAGES.map((s, idx) => {
                    const Icon = s.icon;
                    const present = isStagePresent(s.id);
                    const isActive = thread.activeStage === s.id;
                    const isBlocked = thread.blockedStage === s.id;
                    const isExpanded = expandedStage === s.id;

                    let badgeColor = 'bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text-subtle))] border-[hsl(var(--ui-border))]';
                    if (isBlocked) {
                        badgeColor = 'bg-amber-500/15 text-amber-700 border-amber-500/30 ring-1 ring-amber-500/20';
                    } else if (isActive) {
                        badgeColor = 'bg-[hsl(var(--ui-accent-blue-ink))/0.15] text-[hsl(var(--ui-accent-blue-ink))] border-[hsl(var(--ui-accent-blue-ink))/0.3] ring-1 ring-[hsl(var(--ui-accent-blue-ink))/0.2]';
                    } else if (present) {
                        badgeColor = 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
                    }

                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleStage(s.id)}
                            className={`flex flex-col items-center p-1.5 rounded-lg border text-center transition-all ${badgeColor} ${
                                isExpanded ? 'ring-2 ring-[hsl(var(--ui-accent-blue-ink))/0.4]' : ''
                            }`}
                        >
                            <Icon className="h-3.5 w-3.5 mb-1 shrink-0" />
                            <span className="text-[9px] font-semibold leading-none truncate w-full">
                                {s.label}
                            </span>
                            <span className="text-[8px] opacity-75 mt-0.5">
                                {isBlocked ? '⚠️' : present ? '✓' : '—'}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Block reason notice */}
            {thread.blockReason && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-0.5">
                    <p className="font-bold text-amber-800 text-[11px] flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Ponto de Atenção Operational
                    </p>
                    <p className="text-[11px] text-amber-900/80">{thread.blockReason}</p>
                </div>
            )}

            {/* Expanded Stage Detail Card */}
            {expandedStage && (
                <div className="p-3 bg-[hsl(var(--ui-surface))] rounded-lg border border-[hsl(var(--ui-border))] text-xs space-y-2 transition-all">
                    <div className="flex items-center justify-between border-b border-[hsl(var(--ui-border))] pb-2">
                        <span className="font-bold text-[hsl(var(--ui-text))] capitalize flex items-center gap-1.5">
                            Etapa: {expandedStage}
                        </span>
                        <button
                            type="button"
                            onClick={() => setExpandedStage(null)}
                            className="text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))]"
                        >
                            <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {expandedStage === 'cliente' && (
                        <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Nome / Razão:</span>
                                <span className="font-semibold text-[hsl(var(--ui-text))]">{thread.customer?.name || item.customer?.name || 'Lead WhatsApp'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Contato:</span>
                                <span className="font-mono text-[hsl(var(--ui-text))]">{thread.customer?.phone || item.customer?.phone || 'Contato sem telefone'}</span>
                            </div>
                            {thread.customer?.organization && (
                                <div className="flex justify-between">
                                    <span className="text-[hsl(var(--ui-text-subtle))]">Organização:</span>
                                    <span className="text-[hsl(var(--ui-text))]">{thread.customer.organization}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {expandedStage === 'atendimento' && (
                        <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Canal / Chave:</span>
                                <span className="font-mono text-[hsl(var(--ui-text))]">{thread.conversation?.phoneKey || item.conversation?.phoneKey || 'WhatsApp'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Assunto / Intenção:</span>
                                <span className="font-medium text-[hsl(var(--ui-text))]">{thread.conversation?.lastIntent || item.conversation?.lastIntent || 'Conversa geral'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Aging / Tempo:</span>
                                <span className="font-mono text-[hsl(var(--ui-text))]">{item.age}</span>
                            </div>
                            <Link href={item.href} className="inline-flex items-center gap-1 text-[hsl(var(--ui-accent-blue-ink))] hover:underline pt-1 font-semibold">
                                Abrir Conversa Completa <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    )}

                    {expandedStage === 'cotacao' && (
                        <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Cotação ID:</span>
                                <span className="font-mono text-[hsl(var(--ui-text))]">{thread.quotation?.id || item.quotation?.id || 'Sem cotação ativa'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Transportadora:</span>
                                <span className="text-[hsl(var(--ui-text))]">{thread.quotation?.carrier || item.quotation?.carrier || 'Não selecionada'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Valor Estimado:</span>
                                <span className="font-bold text-[hsl(var(--ui-text))]">
                                    {typeof thread.quotation?.price === 'number'
                                        ? formatCurrency(thread.quotation.price)
                                        : thread.quotation?.price || 'Aguardando simulação'}
                                </span>
                            </div>
                        </div>
                    )}

                    {expandedStage === 'pedido' && (
                        <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Pedido #:</span>
                                <span className="font-mono font-bold text-[hsl(var(--ui-text))]">{thread.order?.id || item.order?.id || 'Aguardando conversão'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Status do Pedido:</span>
                                <span className="font-semibold text-[hsl(var(--ui-text))]">{thread.order?.status || item.order?.status || 'Não gerado'}</span>
                            </div>
                            {thread.order?.total && (
                                <div className="flex justify-between">
                                    <span className="text-[hsl(var(--ui-text-subtle))]">Total:</span>
                                    <span className="font-bold text-[hsl(var(--ui-text))]">
                                        {typeof thread.order.total === 'number'
                                            ? formatCurrency(thread.order.total)
                                            : thread.order.total}
                                    </span>
                                </div>
                            )}
                            <Link href={`/pedidos?id=${thread.order?.id || item.order?.id || ''}`} className="inline-flex items-center gap-1 text-[hsl(var(--ui-accent-blue-ink))] hover:underline pt-1 font-semibold">
                                Inspecionar Pedido <ExternalLink className="h-3 w-3" />
                            </Link>
                        </div>
                    )}

                    {expandedStage === 'logistica' && (
                        <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Tracking / Shipment:</span>
                                <span className="font-mono text-[hsl(var(--ui-text))]">{thread.shipment?.id || item.shipment?.id || 'Sem frete contratado'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Carrier / Status:</span>
                                <span className="text-[hsl(var(--ui-text))]">{thread.shipment?.status || item.shipment?.status || 'Aguardando expedição'}</span>
                            </div>
                            {thread.shipment?.trackingCode && (
                                <div className="flex justify-between">
                                    <span className="text-[hsl(var(--ui-text-subtle))]">Código Rastreio:</span>
                                    <span className="font-mono text-[hsl(var(--ui-text))]">{thread.shipment.trackingCode}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
