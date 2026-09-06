'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Truck, Package, AlertTriangle } from 'lucide-react';
import type { CockpitMetricsSnapshot, WorkItemCategory } from '../../data/shared';

export interface AttentionStripProps {
    metrics: CockpitMetricsSnapshot;
    onSelectCategoryFilter?: (cat: WorkItemCategory | 'all') => void;
}

export function AttentionStrip({ metrics, onSelectCategoryFilter }: AttentionStripProps) {
    return (
        <div className="border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-4 sm:px-6 py-2.5">
            <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                    <span className="text-[hsl(var(--ui-text-subtle))] uppercase tracking-wider font-semibold text-[10px]">
                        Atenção Imediata:
                    </span>
                    <button
                        type="button"
                        onClick={() => onSelectCategoryFilter?.('conversation')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                    >
                        <Clock className="h-3.5 w-3.5" />
                        <span>{metrics.unansweredConversationCount} sem resposta</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelectCategoryFilter?.('freight')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
                    >
                        <Truck className="h-3.5 w-3.5" />
                        <span>{metrics.pendingFreightCount} cotações pendentes</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onSelectCategoryFilter?.('order')}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer"
                    >
                        <Package className="h-3.5 w-3.5" />
                        <span>{metrics.processingOrderCount} em esteira</span>
                    </button>
                    {metrics.errorsAndExceptions > 0 && (
                        <button
                            type="button"
                            onClick={() => onSelectCategoryFilter?.('exception')}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors cursor-pointer"
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>{metrics.errorsAndExceptions} exceções</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="text-[hsl(var(--ui-text-subtle))]">Atalhos:</span>
                    <Link href="/conversas" className="text-[hsl(var(--ui-accent-blue-ink))] font-medium hover:underline">
                        Atendimento
                    </Link>
                    <span className="text-[hsl(var(--ui-border))]">•</span>
                    <Link href="/logistica" className="text-[hsl(var(--ui-accent-blue-ink))] font-medium hover:underline">
                        Cotação & Frete
                    </Link>
                    <span className="text-[hsl(var(--ui-border))]">•</span>
                    <Link href="/pedidos" className="text-[hsl(var(--ui-accent-blue-ink))] font-medium hover:underline">
                        Pedidos
                    </Link>
                </div>
            </div>
        </div>
    );
}
