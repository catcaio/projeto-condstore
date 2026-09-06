'use client';

import React from 'react';
import Link from 'next/link';
import { UserCheck, MessageSquare, Truck, Package, ChevronRight, MousePointerClick } from 'lucide-react';
import { Button } from '@/ui/components';
import type { CockpitActionQueueItem } from '../../data/shared';

export interface ContextPanelProps {
    activeItem: CockpitActionQueueItem | null;
}

export function ContextPanel({ activeItem }: ContextPanelProps) {
    return (
        <aside className="space-y-4">
            <div className="bg-[hsl(var(--ui-surface))] rounded-xl border border-[hsl(var(--ui-border))] p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[hsl(var(--ui-border))] pb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))] flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5 text-[hsl(var(--ui-accent-blue-ink))]" />
                        Contexto Persistente
                    </h3>
                    {activeItem && (
                        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Item Selecionado
                        </span>
                    )}
                </div>

                {activeItem ? (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase font-mono text-[hsl(var(--ui-text-subtle))]">
                                Fila & Identificação
                            </span>
                            <p className="text-sm font-bold text-[hsl(var(--ui-text))]">{activeItem.entity}</p>
                            <p className="text-xs text-[hsl(var(--ui-text-subtle))]">{activeItem.queue}</p>
                        </div>

                        <div className="p-3 bg-[hsl(var(--ui-page))] rounded-lg border border-[hsl(var(--ui-border))] space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Ponto de Bloqueio:</span>
                                <span className="font-semibold text-[hsl(var(--ui-text))]">{activeItem.waitingFor}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Tempo em Fila:</span>
                                <span className="font-mono text-[hsl(var(--ui-text))]">{activeItem.age}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[hsl(var(--ui-text-subtle))]">Atribuído a:</span>
                                <span className="text-[hsl(var(--ui-text))]">{activeItem.owner}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-mono text-[hsl(var(--ui-text-subtle))]">
                                    IA Frank Supervisionada (Co-piloto)
                                </span>
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                    Humano no Loop
                                </span>
                            </div>

                            <div className="text-xs space-y-2 text-[hsl(var(--ui-text-subtle))] bg-[hsl(var(--ui-page))] p-3 rounded-lg border border-[hsl(var(--ui-border))]">
                                <p className="text-[11px] text-[hsl(var(--ui-text))] font-medium">
                                    Sugestão de ação para este item ({activeItem.entity}):
                                </p>
                                <p className="text-[11px] text-[hsl(var(--ui-text-subtle))] italic">
                                    &ldquo;{activeItem.waitingFor}&rdquo;
                                </p>
                                <div className="pt-2 border-t border-[hsl(var(--ui-border))] space-y-1.5">
                                    <div className="flex items-center gap-2 text-[hsl(var(--ui-text))] font-medium">
                                        <MessageSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                        <span>Atendimento: {activeItem.threadContext?.phoneKey ? `Contato ${activeItem.threadContext.phoneKey.slice(-4)}` : 'Conectado'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[hsl(var(--ui-text))] font-medium">
                                        <Truck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                        <span>Cotação / Frete: {activeItem.threadContext?.freightQuoteId ? `Cotação ${activeItem.threadContext.freightQuoteId.slice(0, 8)}` : 'Simulado'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[hsl(var(--ui-text))] font-medium">
                                        <Package className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                        <span>Pedido: {activeItem.threadContext?.orderId ? `#${activeItem.threadContext.orderId}` : 'Aguardando conversão'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Link href={activeItem.href} className="block">
                            <Button className="w-full justify-center">
                                Acessar Contexto Completo
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="py-8 px-4 text-center space-y-3 bg-[hsl(var(--ui-page))] rounded-lg border border-dashed border-[hsl(var(--ui-border))]">
                        <MousePointerClick className="h-7 w-7 text-[hsl(var(--ui-text-subtle))] mx-auto opacity-70" />
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-[hsl(var(--ui-text))]">Nenhum item selecionado</p>
                            <p className="text-[11px] text-[hsl(var(--ui-text-subtle))]">
                                Clique em um item da fila operacional ao lado para inspecionar seu contexto persistente.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
